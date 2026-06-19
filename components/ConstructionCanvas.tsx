"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const rand = (a: number, b: number) => {
  const x = Math.sin(a * 374761.393 + b * 668265.263) * 43758.5453;
  return x - Math.floor(x);
};

const FLOORS = 8;
const FH = 3;
const BAYS = 5;
const BAY = 4;
const BW = BAYS * BAY;
const DEPTH = 8;

export default function ConstructionCanvas({ isDarkMode }: { isDarkMode: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // refs for night-mode mutations (written in main effect, read in second effect)
  const sceneRef          = useRef<THREE.Scene | null>(null);
  const rendererRef       = useRef<THREE.WebGLRenderer | null>(null);
  const fogRef            = useRef<THREE.FogExp2 | null>(null);
  const ambientRef        = useRef<THREE.AmbientLight | null>(null);
  const hemiRef           = useRef<THREE.HemisphereLight | null>(null);
  const sunRef            = useRef<THREE.DirectionalLight | null>(null);
  const fillRef           = useRef<THREE.DirectionalLight | null>(null);
  const bloomRef          = useRef<UnrealBloomPass | null>(null);
  const starsRef          = useRef<THREE.Points | null>(null);
  const moonRef           = useRef<THREE.Mesh | null>(null);
  const nightLightsGroupRef = useRef<THREE.Group | null>(null);
  const mainWinLightsRef  = useRef<THREE.PointLight[]>([]);
  const isDarkModeRef     = useRef(false);
  const markDirtyRef      = useRef<(() => void) | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.55;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    wrap.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene / Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // ── HDR sky image ─────────────────────────────────────────────────────────
    // Place your equirectangular HDR file at /public/sky.hdr
    // Free HDRs: https://polyhaven.com/hdris (download any 1K .hdr, rename to sky.hdr)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new HDRLoader().load(
      "/sky.hdr",
      (hdrTexture) => {
        const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
        scene.background  = envMap; // sky visible behind geometry
        scene.environment = envMap; // drives reflections on glass + metal
        hdrTexture.dispose();
        pmremGenerator.dispose();
      }
    );

    // Fallback colour shown before HDR loads (or if file is missing)
    scene.background = new THREE.Color("#000000");

    // Sun direction fixed independently of HDR (controls shadow angle)
    const sunDir = new THREE.Vector3();
    sunDir.setFromSphericalCoords(
      1,
      THREE.MathUtils.degToRad(38),  // 52° above horizon
      THREE.MathUtils.degToRad(195)  // south-southwest
    );

    // Horizon fog — will blend with HDR sky at distance
    scene.fog = new THREE.FogExp2("#b0c8d8", 0.005);
    fogRef.current = scene.fog as THREE.FogExp2;

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 600);
    const camRadius = 55;
    const camHeight = 24;
    let camAzimuth = Math.PI / 3;
    camera.position.set(Math.sin(camAzimuth) * camRadius, camHeight, Math.cos(camAzimuth) * camRadius);
    camera.lookAt(0, 10, 0);

    // ── Post-processing ───────────────────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.18, 0.3, 0.88);
    composer.addPass(bloom);
    bloomRef.current = bloom;

    // ── Lighting ─────────────────────────────────────────────────────────────
    const hemi = new THREE.HemisphereLight("#87ceeb", "#8b7355", 0.55);
    scene.add(hemi); hemiRef.current = hemi;
    const ambient = new THREE.AmbientLight("#c0d8ee", 0.3);
    scene.add(ambient); ambientRef.current = ambient;

    const sun = new THREE.DirectionalLight("#ffe8c0", 1.8);
    sun.position.copy(sunDir).multiplyScalar(100);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 220;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 70;
    sun.shadow.camera.bottom = -10;
    sun.shadow.bias = -0.001;
    scene.add(sun);
    sunRef.current = sun;

    const fill = new THREE.DirectionalLight("#b0cce0", 0.5);
    fill.position.set(-30, 40, -20);
    scene.add(fill);
    fillRef.current = fill;

    // ── Helper: cylinder from point A to point B ─────────────────────────────
    const cylBetween = (
      a: THREE.Vector3, b: THREE.Vector3,
      r: number, mat: THREE.Material, segs = 5
    ): THREE.Mesh => {
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length();
      const geo = new THREE.CylinderGeometry(r, r, len, segs);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(a).lerp(b, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      return mesh;
    };

    // ── Window texture helper ─────────────────────────────────────────────────
    const textures: THREE.CanvasTexture[] = [];
    const makeWindowTex = (cols: number, rows: number, fg: string, wc: string): THREE.CanvasTexture => {
      const c = document.createElement("canvas");
      c.width = 128; c.height = 256;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = fg; ctx.fillRect(0, 0, 128, 256);
      ctx.fillStyle = wc;
      const cw = 128 / cols, rh = 256 / rows;
      for (let ci = 0; ci < cols; ci++)
        for (let ri = 0; ri < rows; ri++)
          ctx.fillRect(ci * cw + 3, ri * rh + 3, cw - 6, rh - 6);
      const tex = new THREE.CanvasTexture(c);
      textures.push(tex);
      return tex;
    };

    // ── Materials ─────────────────────────────────────────────────────────────
    const matConcrete     = new THREE.MeshStandardMaterial({ color: "#8a9aaa", roughness: 0.82, metalness: 0.05 });
    const matConcreteLight = new THREE.MeshStandardMaterial({ color: "#a0b0be", roughness: 0.78, metalness: 0.05 });
    const matSteel        = new THREE.MeshStandardMaterial({ color: "#c0d0e0", roughness: 0.18, metalness: 0.92 });
    const matSteelDim     = new THREE.MeshStandardMaterial({ color: "#90a8c0", roughness: 0.32, metalness: 0.78 });
    const matSlab         = new THREE.MeshStandardMaterial({ color: "#8a9aaa", roughness: 0.88, metalness: 0.0 });
    const matGlass        = new THREE.MeshPhysicalMaterial({
      color: "#4a8cb0", roughness: 0.04, metalness: 0.0,
      transmission: 0.82, ior: 1.5, reflectivity: 0.7,
      thickness: 0.08, transparent: true, opacity: 0.92, envMapIntensity: 1.0,
    });
    const matGround       = new THREE.MeshStandardMaterial({ color: "#6f6f6f", roughness: 0.92, metalness: 0.0 });
    const matDirt         = new THREE.MeshStandardMaterial({ color: "#7a6550", roughness: 0.95, metalness: 0.0 });
    const matCrane        = new THREE.MeshStandardMaterial({ color: "#f5c842", roughness: 0.38, metalness: 0.55 });
    const matCraneAccent  = new THREE.MeshStandardMaterial({ color: "#f57f20", roughness: 0.4,  metalness: 0.5 });
    const matBarrier      = new THREE.MeshStandardMaterial({ color: "#e65100", roughness: 0.7,  metalness: 0.1 });
    const matAmber        = new THREE.MeshStandardMaterial({
      color: "#f97316", roughness: 0.6, metalness: 0.1,
      emissive: "#f97316", emissiveIntensity: 0.8,
    });
    const matPlywood      = new THREE.MeshStandardMaterial({ color: "#c8aa70", roughness: 0.88, metalness: 0.0 });
    const matFormPanel    = new THREE.MeshStandardMaterial({ color: "#b0903a", roughness: 0.72, metalness: 0.08 });
    const matScaffoldTube = new THREE.MeshStandardMaterial({ color: "#7a6040", roughness: 0.85, metalness: 0.25 });
    const matScaffoldBoard= new THREE.MeshStandardMaterial({ color: "#c4b07a", roughness: 0.95, metalness: 0.0 });
    const matHighViz      = new THREE.MeshStandardMaterial({
      color: "#e8a020", roughness: 0.7, metalness: 0.05,
      emissive: "#e8a020", emissiveIntensity: 0.3,
    });
    const matCounterweight= new THREE.MeshStandardMaterial({ color: "#5a5a5a", roughness: 0.88, metalness: 0.08 });
    const matCabGlass     = new THREE.MeshPhysicalMaterial({
      color: "#2a5a80", roughness: 0.08, metalness: 0.0,
      transmission: 0.7, transparent: true, opacity: 0.8,
    });
    const matVehicleYellow= new THREE.MeshStandardMaterial({ color: "#f0b429", roughness: 0.45, metalness: 0.35 });
    const matVehicleRed   = new THREE.MeshStandardMaterial({ color: "#c0392b", roughness: 0.5,  metalness: 0.2  });
    const matVehicleGrey  = new THREE.MeshStandardMaterial({ color: "#888899", roughness: 0.6,  metalness: 0.3  });
    const matTrack        = new THREE.MeshStandardMaterial({ color: "#2a2a2a", roughness: 0.95, metalness: 0.1  });
    const matHardHatWhite = new THREE.MeshStandardMaterial({ color: "#e8e8e0", roughness: 0.6  });
    const matHardHatOrange= new THREE.MeshStandardMaterial({ color: "#e85d04", roughness: 0.6  });
    const matHardHatYellow= new THREE.MeshStandardMaterial({ color: "#f5c842", roughness: 0.6  });
    const matSkin         = new THREE.MeshStandardMaterial({ color: "#c68642", roughness: 0.8  });
    const matWorkPants    = new THREE.MeshStandardMaterial({ color: "#3d5a80", roughness: 0.9  });

    // ── Worker figure helper ──────────────────────────────────────────────────
    const makeWorker = (
      parent: THREE.Object3D,
      x: number, y: number, z: number,
      facingY: number,
      hatMat: THREE.Material
    ): THREE.Group => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = facingY;
      // legs
      for (const lx of [-0.07, 0.07]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.52, 0.13), matWorkPants);
        leg.position.set(lx, 0.26, 0);
        leg.castShadow = true;
        g.add(leg);
      }
      // torso (high-viz)
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.18), matHighViz);
      torso.position.set(0, 0.73, 0);
      torso.castShadow = true;
      g.add(torso);
      // arms
      for (const ax of [-0.22, 0.22]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.1), matHighViz);
        arm.position.set(ax, 0.65, 0);
        arm.rotation.z = ax < 0 ? 0.25 : -0.25;
        arm.castShadow = true;
        g.add(arm);
      }
      // head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 8, 6), matSkin);
      head.position.set(0, 1.07, 0);
      head.castShadow = true;
      g.add(head);
      // hard hat crown
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.14, 0.12, 10), hatMat);
      crown.position.set(0, 1.19, 0);
      g.add(crown);
      // hard hat brim
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.03, 10), hatMat);
      brim.position.set(0, 1.14, 0);
      g.add(brim);
      parent.add(g);
      return g;
    };

    // ── Ground ────────────────────────────────────────────────────────────────
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), matGround);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const dirt = new THREE.Mesh(new THREE.PlaneGeometry(BW + 10, DEPTH + 10), matDirt);
    dirt.rotation.x = -Math.PI / 2;
    dirt.position.y = 0.01;
    dirt.receiveShadow = true;
    scene.add(dirt);

    // Orange safety barrier fence
    const barrierH = 1.1, barrierT = 0.18;
    const siteW = BW + 12, siteD = DEPTH + 12;
    for (const [bx, bz, bw, bd] of [
      [0, siteD / 2, siteW, barrierT], [0, -siteD / 2, siteW, barrierT],
      [siteW / 2, 0, barrierT, siteD], [-siteW / 2, 0, barrierT, siteD],
    ] as [number, number, number, number][]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(bw, barrierH, bd), matBarrier);
      bar.position.set(bx, barrierH / 2, bz);
      bar.castShadow = true;
      scene.add(bar);
    }
    for (let i = -2; i <= 2; i++) {
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, barrierH + 0.3, 0.2), matBarrier);
        post.position.set(i * 5, (barrierH + 0.3) / 2, side * siteD / 2);
        scene.add(post);
        const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, barrierH + 0.3, 0.2), matBarrier);
        post2.position.set(side * siteW / 2, (barrierH + 0.3) / 2, i * 3);
        scene.add(post2);
      }
    }

    // ── Excavator ─────────────────────────────────────────────────────────────
    const excavatorGroup = new THREE.Group();
    excavatorGroup.position.set(20, 0, 14);
    excavatorGroup.rotation.y = -2.4;
    scene.add(excavatorGroup);

    // undercarriage tracks
    const ucBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 1.2), matVehicleYellow);
    ucBase.position.set(0, 0.28, 0);
    ucBase.castShadow = true;
    excavatorGroup.add(ucBase);
    for (const tz of [-0.72, 0.72]) {
      const track = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.6, 0.55), matTrack);
      track.position.set(0, 0.3, tz);
      track.castShadow = true;
      excavatorGroup.add(track);
      // track rollers
      for (const rx of [-1.3, -0.43, 0.43, 1.3]) {
        const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.52, 10), matTrack);
        roller.rotation.z = Math.PI / 2;
        roller.position.set(rx, 0.28, tz);
        excavatorGroup.add(roller);
      }
    }
    // upper body (slew ring + cab)
    const slewBase = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.22, 12), matVehicleYellow);
    slewBase.position.set(0, 0.66, 0);
    excavatorGroup.add(slewBase);
    const excCab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.5), matVehicleYellow);
    excCab.position.set(-0.3, 1.47, 0);
    excCab.castShadow = true;
    excavatorGroup.add(excCab);
    const excWin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 1.0), matCabGlass);
    excWin.position.set(0.82, 1.52, 0);
    excavatorGroup.add(excWin);
    const engineHood = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 1.5), matVehicleYellow);
    engineHood.position.set(0.85, 1.05, 0);
    excavatorGroup.add(engineHood);
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 7), matSteelDim);
    exhaust.position.set(1.0, 1.65, -0.4);
    excavatorGroup.add(exhaust);
    // boom (angled up from cab front)
    const boomGrp = new THREE.Group();
    boomGrp.position.set(0.95, 0.88, 0);
    boomGrp.rotation.z = -0.55;
    excavatorGroup.add(boomGrp);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.6, 0.32), matVehicleYellow);
    boom.position.set(0, 1.3, 0);
    boom.castShadow = true;
    boomGrp.add(boom);
    // arm (bent from boom tip)
    const armGrp = new THREE.Group();
    armGrp.position.set(0, 2.6, 0);
    armGrp.rotation.z = 0.6;
    boomGrp.add(armGrp);
    const excArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.8, 0.24), matVehicleYellow);
    excArm.position.set(0, 0.9, 0);
    excArm.castShadow = true;
    armGrp.add(excArm);
    // bucket
    const bucketGrp = new THREE.Group();
    bucketGrp.position.set(0, 1.8, 0);
    bucketGrp.rotation.z = -1.1;
    armGrp.add(bucketGrp);
    const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.75), matTrack);
    bucket.position.set(0, 0.28, 0);
    bucketGrp.add(bucket);
    const bucketTooth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), matSteelDim);
    for (const btx of [-0.32, -0.1, 0.1, 0.32]) {
      const t = bucketTooth.clone();
      t.position.set(btx, 0.56, 0);
      bucketGrp.add(t);
    }
    // hydraulic cylinders (decorative tubes on boom)
    const hydGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6);
    const hyd1 = new THREE.Mesh(hydGeo, matSteelDim);
    hyd1.rotation.z = -0.45;
    hyd1.position.set(0.18, 1.2, 0.18);
    boomGrp.add(hyd1);

    // ── Concrete Mixer Truck ───────────────────────────────────────────────────
    const mixerGroup = new THREE.Group();
    mixerGroup.position.set(-22, 0, 12);
    mixerGroup.rotation.y = 0.5;
    scene.add(mixerGroup);

    // chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.55, 2.3), matVehicleGrey);
    chassis.position.set(0, 0.55, 0);
    chassis.castShadow = true;
    mixerGroup.add(chassis);
    // cab
    const mixCab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.3), matVehicleRed);
    mixCab.position.set(2.0, 1.72, 0);
    mixCab.castShadow = true;
    mixerGroup.add(mixCab);
    const mixCabWin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.1, 1.7), matCabGlass);
    mixCabWin.position.set(3.04, 1.9, 0);
    mixerGroup.add(mixCabWin);
    // drum (tapered cylinder on its side)
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.65, 3.4, 14), matVehicleGrey);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(-0.8, 1.95, 0);
    drum.castShadow = true;
    mixerGroup.add(drum);
    // drum fins
    for (let fi = 0; fi < 4; fi++) {
      const angle = (fi / 4) * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 0.28), matVehicleRed);
      fin.rotation.x = angle;
      fin.position.set(-0.8, 1.95 + Math.sin(angle) * 0.78, Math.cos(angle) * 0.78);
      mixerGroup.add(fin);
    }
    // drum support frame
    const drumFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 2.35), matVehicleGrey);
    drumFrame.position.set(-2.5, 1.3, 0);
    mixerGroup.add(drumFrame);
    // wheels (3 axles × 2 sides)
    const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.28, 12);
    const hubGeo   = new THREE.CylinderGeometry(0.18, 0.18, 0.3,  8);
    for (const wx of [2.2, 0.0, -1.6]) {
      for (const wz of [-1.25, 1.25]) {
        const wheel = new THREE.Mesh(wheelGeo, matTrack);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.46, wz);
        mixerGroup.add(wheel);
        const hub = new THREE.Mesh(hubGeo, matVehicleGrey);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(wx, 0.46, wz + (wz < 0 ? -0.16 : 0.16));
        mixerGroup.add(hub);
      }
    }
    // chute (angled box at drum rear)
    const chute = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.2, 0.18), matVehicleGrey);
    chute.rotation.z = 0.7;
    chute.position.set(-2.6, 1.65, 0);
    mixerGroup.add(chute);

    // ── Dump Truck ─────────────────────────────────────────────────────────────
    const dumpGroup = new THREE.Group();
    dumpGroup.position.set(24, 0, 2);
    dumpGroup.rotation.y = 2.8;
    scene.add(dumpGroup);

    // chassis
    const dChassis = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.5, 2.4), matVehicleYellow);
    dChassis.position.set(0, 0.5, 0);
    dChassis.castShadow = true;
    dumpGroup.add(dChassis);
    // cab
    const dCab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.9, 2.4), matVehicleYellow);
    dCab.position.set(1.7, 1.7, 0);
    dCab.castShadow = true;
    dumpGroup.add(dCab);
    const dWin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.0, 1.8), matCabGlass);
    dWin.position.set(2.65, 1.85, 0);
    dumpGroup.add(dWin);
    // tipper bed (slightly raised at rear)
    const bedPivot = new THREE.Group();
    bedPivot.position.set(-0.6, 0.75, 0);
    bedPivot.rotation.z = 0.12;
    dumpGroup.add(bedPivot);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.3, 2.35), matVehicleYellow);
    bed.position.set(-0.2, 0.15, 0);
    bed.castShadow = true;
    bedPivot.add(bed);
    // bed sides + front wall
    for (const bz of [-1.18, 1.18]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.1, 0.12), matVehicleYellow);
      side.position.set(-0.2, 0.7, bz);
      bedPivot.add(side);
    }
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 2.35), matVehicleYellow);
    frontWall.position.set(1.7, 0.7, 0);
    bedPivot.add(frontWall);
    // wheels (2 axles × 2 sides)
    for (const wx of [1.6, -0.8]) {
      for (const wz of [-1.28, 1.28]) {
        const dw = new THREE.Mesh(wheelGeo, matTrack);
        dw.rotation.z = Math.PI / 2;
        dw.position.set(wx, 0.46, wz);
        dumpGroup.add(dw);
      }
    }

    // Night-only group — created early so street lights and window bulbs can both use it
    const nightLightsGroup = new THREE.Group();
    scene.add(nightLightsGroup);
    nightLightsGroup.visible = false;
    nightLightsGroupRef.current = nightLightsGroup;

    // ── Road (horizontal X axis — runs left-right across the building front) ───
    const roadDepth   = 12;                             // Z span: two 6-unit lanes
    const roadLength  = 240;                            // X span: fades into fog at ±120
    const roadCentreZ = siteD / 2 + roadDepth / 2;     // z = 16

    const matAsphalt = new THREE.MeshStandardMaterial({ color: "#1c1c1c", roughness: 0.95, metalness: 0.0 });
    const matKerb    = new THREE.MeshStandardMaterial({ color: "#9a9a96", roughness: 0.88, metalness: 0.0 });
    const matMark    = new THREE.MeshStandardMaterial({ color: "#e8e8d0", roughness: 0.6,  metalness: 0.0 });

    // Asphalt surface
    const road = new THREE.Mesh(new THREE.BoxGeometry(roadLength, 0.025, roadDepth), matAsphalt);
    road.position.set(0, 0.012, roadCentreZ);
    road.receiveShadow = true;
    scene.add(road);

    // Kerbs — near side (z≈10) and far side (z≈22)
    for (const sz of [-1, 1]) {
      const kerb = new THREE.Mesh(new THREE.BoxGeometry(roadLength, 0.12, 0.3), matKerb);
      kerb.position.set(0, 0.06, roadCentreZ + sz * (roadDepth / 2 + 0.15));
      scene.add(kerb);
    }

    // Centre dashes along X — 22 dashes, 10 units apart
    for (let i = 0; i < 22; i++) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.03, 0.14), matMark);
      dash.position.set(-105 + i * 10, 0.03, roadCentreZ);
      scene.add(dash);
    }

    // Lane divider lines (solid) at z=13 and z=19
    for (const lz of [roadCentreZ - 3, roadCentreZ + 3]) {
      const lane = new THREE.Mesh(new THREE.BoxGeometry(roadLength, 0.03, 0.08), matMark);
      lane.position.set(0, 0.03, lz);
      scene.add(lane);
    }

    // Stop line — at site barrier edge, spans road depth
    const stopLine = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, roadDepth), matMark);
    stopLine.position.set(siteW / 2 + 0.5, 0.03, roadCentreZ);
    scene.add(stopLine);

    // ── Street lights ─────────────────────────────────────────────────────────
    // Physical poles are always in scene. Emissive lamp heads join nightLightsGroup.
    const matPole = new THREE.MeshStandardMaterial({ color: "#2e2e2e", roughness: 0.65, metalness: 0.55 });
    const matLampHousing = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.5, metalness: 0.4 });
    const poleGeo  = new THREE.CylinderGeometry(0.07, 0.10, 5.2, 8);
    const armGeo   = new THREE.CylinderGeometry(0.045, 0.045, 2.2, 6);
    const lampGeo  = new THREE.BoxGeometry(0.55, 0.18, 0.38);
    const glowGeo  = new THREE.SphereGeometry(0.28, 8, 6);
    const matGlow  = new THREE.MeshStandardMaterial({
      color: "#ffb830", emissive: "#ffb830", emissiveIntensity: 6, roughness: 1, metalness: 0,
    });

    // nearZ: footpath edge just inside near kerb; farZ: just inside far kerb
    const nearZ = roadCentreZ - roadDepth / 2 - 0.5;  // ≈  9.5
    const farZ  = roadCentreZ + roadDepth / 2 + 0.5;  // ≈ 22.5
    const poleH = 5.2;

    const addStreetLight = (x: number, z: number, armDir: 1 | -1) => {
      // Pole
      const pole = new THREE.Mesh(poleGeo, matPole);
      pole.position.set(x, poleH / 2, z);
      pole.castShadow = true;
      scene.add(pole);
      // Horizontal arm (rotated to face road)
      const arm = new THREE.Mesh(armGeo, matPole);
      arm.rotation.x = Math.PI / 2;  // lay horizontal along Z
      arm.position.set(x, poleH - 0.15, z + armDir * 1.1);
      scene.add(arm);
      // Lamp housing (dark in day)
      const lamp = new THREE.Mesh(lampGeo, matLampHousing);
      lamp.position.set(x, poleH - 0.28, z + armDir * 2.1);
      scene.add(lamp);
      // Emissive glow bulb — only visible at night via nightLightsGroup
      const glow = new THREE.Mesh(glowGeo, matGlow);
      glow.position.set(x, poleH - 0.28, z + armDir * 2.1);
      nightLightsGroup.add(glow);
    };

    // Near-side lights (south kerb, arm points toward road = +Z)
    const nearXs = [-50, -34, -18, -2, 14, 30, 46];
    for (const x of nearXs) addStreetLight(x, nearZ, 1);

    // Far-side lights (north kerb, arm points toward road = -Z), staggered
    const farXs  = [-42, -26, -10, 6, 22, 38];
    for (const x of farXs)  addStreetLight(x, farZ, -1);

    // ── Ground workers ─────────────────────────────────────────────────────────
    interface WorkerEntry { group: THREE.Group; pMin: number; pMax: number; }
    const groundWorkers: WorkerEntry[] = [];

    const addGW = (x: number, z: number, facing: number, hat: THREE.Material, pMin: number, pMax: number) => {
      const g = makeWorker(scene, x, 0, z, facing, hat);
      groundWorkers.push({ group: g, pMin, pMax });
    };

    // near excavator
    addGW(18,  10, -2.0, matHardHatOrange, 0.00, 0.18);
    addGW(16,  13,  2.8, matHardHatYellow, 0.00, 0.18);
    // near site entrance (front)
    addGW(-4,  14,  0.3, matHardHatWhite,  0.02, 1.00);
    addGW( 3,  15, -0.6, matHardHatOrange, 0.02, 1.00);
    // near mixer truck
    addGW(-18, 10,  1.2, matHardHatYellow, 0.12, 0.78);
    addGW(-20, 13, -0.4, matHardHatWhite,  0.12, 0.78);

    // ── Sky dome ──────────────────────────────────────────────────────────────
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(280, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          topColor: { value: new THREE.Color("#0d47a1") },
          midColor: { value: new THREE.Color("#2980c4") },
          botColor: { value: new THREE.Color("#a8d4f0") },
        },
        vertexShader: `varying float vY; void main(){ vY=normalize(position).y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 topColor,midColor,botColor; varying float vY;
          void main(){
            float t=clamp(vY,-1.0,1.0);
            vec3 c=t>0.0?mix(midColor,topColor,pow(t,0.7)):mix(botColor,midColor,t+1.0);
            gl_FragColor=vec4(c,1.0);
          }`,
      })
    ));

    // ── Background city buildings ─────────────────────────────────────────────
    type BldgDef = [number, number, number, number, number];
    const allBuildings: BldgDef[] = [
      [-95,-50,16,32,0],[-72,-48,13,45,1],[-52,-52,20,28,0],[-30,-49,12,38,1],
      [-14,-51,18,25,2],[8,-50,10,52,1],[24,-48,22,35,0],[48,-52,16,42,1],
      [68,-49,14,30,2],[87,-51,19,48,1],[108,-50,15,36,0],[-112,-52,12,28,1],
      [-100,-88,24,50,1],[-70,-92,18,38,0],[-44,-89,21,55,1],[-18,-91,16,42,2],
      [5,-90,22,30,0],[30,-88,19,48,1],[56,-92,24,58,1],[82,-89,18,40,0],
      [108,-91,20,45,1],[-125,-90,16,35,0],
      [-115,-135,28,60,1],[-78,-138,22,50,0],[-42,-133,25,68,1],
      [-8,-136,20,55,2],[28,-134,30,72,1],[66,-137,24,58,0],[102,-135,22,62,1],
      [-80,-15,20,38,1],[-100,-30,18,45,0],[-75,-35,15,30,2],[-95,5,16,42,1],
      [72,-20,18,35,0],[90,-10,22,50,1],[78,-38,15,28,2],[105,-25,20,44,1],
    ];
    for (const [bx, bz, bw, bh, btype] of allBuildings) {
      const isGlass = btype === 1;
      const tex = makeWindowTex(
        isGlass ? 5 : 4, Math.max(2, Math.round(bh / 4)),
        isGlass ? (rand(bx, bz) > 0.5 ? "#4a7fa8" : "#3a6a90") : "#9da8b0",
        isGlass ? "#2a5070" : "#1a2a3a"
      );
      const bgMat = new THREE.MeshStandardMaterial({ map: tex, roughness: isGlass ? 0.12 : 0.78, metalness: isGlass ? 0.6 : 0.04 });
      const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bw * 0.6), bgMat);
      m.position.set(bx, bh / 2, bz);
      m.castShadow = true; m.receiveShadow = true;
      scene.add(m);
      const par = new THREE.Mesh(
        new THREE.BoxGeometry(bw + 0.4, 0.6, bw * 0.6 + 0.4),
        new THREE.MeshStandardMaterial({ color: isGlass ? "#7a9ab0" : "#a0aab2", roughness: 0.7 })
      );
      par.position.set(bx, bh + 0.3, bz);
      scene.add(par);
    }

    // ── Night window bulb meshes (all background buildings) ──────────────────
    // Emissive small boxes at random window positions — visible only in night mode.
    // nightLightsGroup created before road/street-lights so addStreetLight can reference it.
    const winGeo  = new THREE.BoxGeometry(0.52, 0.62, 0.06);
    const matWinW = new THREE.MeshStandardMaterial({ color: "#ffe8a0", emissive: "#ffe8a0", emissiveIntensity: 5, roughness: 1, metalness: 0 });
    const matWinC = new THREE.MeshStandardMaterial({ color: "#d8eaff", emissive: "#d8eaff", emissiveIntensity: 3.5, roughness: 1, metalness: 0 });

    // allBuildings window bulbs — front and back faces
    for (const [bx, bz, bw, bh] of allBuildings) {
      const halfW  = bw / 2;
      const halfD  = (bw * 0.6) / 2;
      const colSp  = 2.2;
      const rowSp  = 3.0;
      const cols   = Math.max(2, Math.floor(bw / colSp));
      const rows   = Math.max(2, Math.floor(bh / rowSp));
      for (const fz of [bz + halfD + 0.06, bz - halfD - 0.06]) {
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            if (rand(bx * 7 + c * 3.1, fz * 5 + r * 2.3) > 0.38) continue;
            const wx = bx - halfW + (c + 0.5) * colSp;
            const wy = (r + 0.5) * rowSp + 0.6;
            if (wy > bh - 0.8) continue;
            const mat = rand(bx + c * 1.7, fz + r) > 0.22 ? matWinW : matWinC;
            const bulb = new THREE.Mesh(winGeo, mat);
            bulb.position.set(wx, wy, fz);
            nightLightsGroup.add(bulb);
          }
        }
      }
    }

    // ── Background city buildings (left side of frame) ───────────────────────
    // Uses the same matGlass, matConcrete, matSteel, matSlab, matSteelDim as
    // the main building so quality matches exactly.

    const makeBgBuilding = (
      ox: number, oz: number,
      bays: number, baySize: number, depth: number,
      floors: number, floorH: number
    ): THREE.PointLight[] => {
      const bw = bays * baySize;
      const grp = new THREE.Group();
      grp.position.set(ox, 0, oz);
      scene.add(grp);

      // Concrete core (centred)
      const coreW = Math.max(baySize * 0.8, 2.5);
      const coreD = Math.min(depth * 0.6, 3.5);
      const totalH = floors * floorH;
      const core = new THREE.Mesh(new THREE.BoxGeometry(coreW, totalH, coreD), matConcrete);
      core.position.set(0, totalH / 2, 0);
      core.castShadow = true; core.receiveShadow = true;
      grp.add(core);

      for (let f = 0; f < floors; f++) {
        const yBase = f * floorH;

        // Columns at every bay corner
        for (let b = 0; b <= bays; b++) {
          const cx = -bw / 2 + b * baySize;
          for (const side of [-1, 1]) {
            const col = new THREE.Mesh(
              new THREE.CylinderGeometry(0.11, 0.14, floorH, 8),
              matSteel
            );
            col.position.set(cx, yBase + floorH / 2, side * (depth / 2));
            col.castShadow = true;
            grp.add(col);
          }
        }

        // Perimeter beams at floor top
        for (const side of [-1, 1]) {
          const bm = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.16, 0.16), matSteel);
          bm.position.set(0, yBase + floorH, side * (depth / 2));
          grp.add(bm);
        }
        for (let b = 0; b <= bays; b++) {
          const cx = -bw / 2 + b * baySize;
          const bm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, depth), matSteel);
          bm.position.set(cx, yBase + floorH, 0);
          grp.add(bm);
        }

        // Concrete slab
        const slab = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.20, depth), matSlab);
        slab.position.set(0, yBase + floorH, 0);
        slab.receiveShadow = true;
        grp.add(slab);

        // Glass facade panels — front and back faces only
        for (let b = 0; b < bays; b++) {
          const px = -bw / 2 + b * baySize + baySize / 2;
          for (const side of [-1, 1]) {
            const panel = new THREE.Mesh(
              new THREE.BoxGeometry(baySize - 0.28, floorH - 0.28, 0.07),
              matGlass
            );
            panel.position.set(px, yBase + floorH / 2, side * (depth / 2));
            grp.add(panel);
          }
        }

        // Side spandrel panels (solid) — left and right faces
        for (let seg = 0; seg < 2; seg++) {
          const sz = -depth / 2 + seg * (depth / 2) + depth / 4;
          for (const side of [-1, 1]) {
            const sp = new THREE.Mesh(
              new THREE.BoxGeometry(0.07, floorH - 0.28, depth / 2 - 0.28),
              matConcreteLight
            );
            sp.position.set(side * (bw / 2), yBase + floorH / 2, sz);
            grp.add(sp);
          }
        }

        // Night window bulbs — random bays on front face, in world space
        for (let b = 0; b < bays; b++) {
          if (rand(ox + b * 2.1, oz + f * 3.7) > 0.42) continue;
          const px = -bw / 2 + b * baySize + baySize / 2;
          const py = yBase + floorH * 0.5;
          const mat = rand(ox + b, oz + f * 1.3) > 0.22 ? matWinW : matWinC;
          const bulb = new THREE.Mesh(winGeo, mat);
          bulb.position.set(ox + px, py, oz + depth / 2 + 0.07);
          nightLightsGroup.add(bulb);
        }
      }

      // Parapet cap
      const par = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.5, 0.55, depth + 0.5), matConcreteLight);
      par.position.set(0, floors * floorH + 0.275, 0);
      grp.add(par);

      return [];
    };

    // Buildings: (x, z, bays, baySize, depth, floors, floorH)
    // Buildings: (x, z, bays, baySize, depth, floors, floorH)
    // ── Left cluster ──────────────────────────────────────────────────────────
    makeBgBuilding(-42,  -8,  2, 4.5,  8, 16, 3.0);
    makeBgBuilding(-58,   3,  4, 3.5, 10,  9, 3.0);
    makeBgBuilding(-36,   4,  2, 3.5,  7,  6, 3.0);
    makeBgBuilding(-68,  -4,  2, 4.0,  9, 12, 3.0);
    makeBgBuilding(-30, -14,  3, 3.5,  7,  7, 3.0);
    makeBgBuilding(-52, -15,  2, 4.0,  8, 11, 3.0);
    makeBgBuilding(-76,   3,  3, 3.5,  9,  7, 3.0);
    // ── Left extension ────────────────────────────────────────────────────────
    makeBgBuilding(-88,  -2,  2, 4.0,  8, 19, 3.0);
    makeBgBuilding(-82,  27,  3, 3.5,  9,  8, 3.0);
    makeBgBuilding(-95,   4,  2, 4.5,  8, 14, 3.0);
    makeBgBuilding(-70, -18,  3, 4.0,  9, 10, 3.0);
    makeBgBuilding(-100, -6,  2, 4.0,  8, 22, 3.0);
    makeBgBuilding(-110,  4,  3, 3.5,  9, 12, 3.0);
    makeBgBuilding(-48,  27,  2, 3.5,  7,  5, 3.0);
    makeBgBuilding(-65,  28,  3, 3.5,  8,  7, 3.0);
    // ── Behind main building (negative Z) ─────────────────────────────────────
    makeBgBuilding(-12, -28,  3, 4.0,  9, 13, 3.0);
    makeBgBuilding(  8, -32,  2, 4.5,  8, 18, 3.0);
    makeBgBuilding( 24, -26,  3, 3.5,  9,  9, 3.0);
    makeBgBuilding(-28, -35,  2, 4.0,  8, 11, 3.0);
    makeBgBuilding( 18, -42,  2, 4.0,  9, 15, 3.0);
    makeBgBuilding( -4, -48,  3, 3.5,  8,  8, 3.0);
    makeBgBuilding( 32, -38,  2, 3.5,  7, 10, 3.0);
    // ── Left-side street corridor (screen-left in initial view) ───────────────
    makeBgBuilding(-24,   2,  2, 4.0,  8, 10, 3.0);
    makeBgBuilding(-22, -10,  3, 3.5,  7,  7, 3.0);
    makeBgBuilding(-27,   3,  2, 3.5,  7,  5, 3.0);
    makeBgBuilding(-20, -20,  2, 4.0,  8, 13, 3.0);
    // ── Right side (camera-right, kept at safe distance) ──────────────────────
    makeBgBuilding( 28,  -8,  2, 4.0,  8, 14, 3.0);
    makeBgBuilding( 22, -18,  2, 4.5,  8, 20, 3.0);
    makeBgBuilding( 46, -14,  2, 4.0,  8, 11, 3.0);

    // ── Building group ────────────────────────────────────────────────────────
    const buildingGroup = new THREE.Group();
    scene.add(buildingGroup);

    // Foundation
    const pit = new THREE.Mesh(
      new THREE.BoxGeometry(BW + 4, 2, DEPTH + 4),
      new THREE.MeshStandardMaterial({ color: "#4a3a28", roughness: 1 })
    );
    pit.position.set(0, -1, 0); pit.receiveShadow = true; pit.visible = false;
    buildingGroup.add(pit);

    const foundationSlab = new THREE.Mesh(new THREE.BoxGeometry(BW + 2, 0.6, DEPTH + 2), matConcrete);
    foundationSlab.position.set(0, 0.3, 0);
    foundationSlab.castShadow = true; foundationSlab.receiveShadow = true;
    foundationSlab.scale.y = 0;
    buildingGroup.add(foundationSlab);

    const pileCaps: THREE.Mesh[] = [];
    for (let b = 0; b <= BAYS; b++) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, DEPTH + 1), matConcreteLight);
      cap.position.set(-BW / 2 + b * BAY, 0.2, 0);
      cap.visible = false;
      buildingGroup.add(cap);
      pileCaps.push(cap);
    }

    // Concrete core
    const coreGroup = new THREE.Group();
    buildingGroup.add(coreGroup);

    const coreMesh = new THREE.Mesh(new THREE.BoxGeometry(4, FLOORS * FH, 3.5), matConcrete);
    coreMesh.castShadow = true; coreMesh.receiveShadow = true;
    coreMesh.position.set(0, (FLOORS * FH) / 2, 0);
    coreGroup.add(coreMesh);

    const coreEdge = new THREE.Mesh(
      new THREE.BoxGeometry(4.1, FLOORS * FH, 3.6),
      new THREE.MeshStandardMaterial({ color: "#b0bcc8", roughness: 0.8, transparent: true, opacity: 0.2 })
    );
    coreEdge.position.copy(coreMesh.position);
    coreGroup.add(coreEdge);
    coreGroup.scale.y = 0;

    // Concrete pump pipe (rides with the core)
    const pumpPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, FLOORS * FH, 6), matSteelDim);
    pumpPipe.position.set(2.3, (FLOORS * FH) / 2, 0);
    pumpPipe.castShadow = true;
    coreGroup.add(pumpPipe);

    // ── Per-floor structural elements ─────────────────────────────────────────
    interface FloorEl {
      columns: THREE.Mesh[]; beams: THREE.Mesh[]; braces: THREE.Mesh[];
      slab: THREE.Mesh; shearWall: THREE.Mesh | null;
      glassPanels: THREE.Mesh[]; windowLights: THREE.PointLight[];
    }
    const floors: FloorEl[] = [];

    for (let f = 0; f < FLOORS; f++) {
      const yBase = f * FH;
      const floorGroup = new THREE.Group();
      buildingGroup.add(floorGroup);

      const columns: THREE.Mesh[] = [];
      for (let b = 0; b <= BAYS; b++) {
        const cx = -BW / 2 + b * BAY;
        for (const side of [-1, 1]) {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, FH, 8), matSteel);
          col.position.set(cx, yBase + FH / 2, side * (DEPTH / 2));
          col.castShadow = true;
          floorGroup.add(col);
          columns.push(col);
        }
      }

      const beams: THREE.Mesh[] = [];
      for (const side of [-1, 1]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(BW, 0.18, 0.18), matSteel);
        b.position.set(0, yBase + FH, side * (DEPTH / 2));
        b.castShadow = true; floorGroup.add(b); beams.push(b);
      }
      for (let b = 0; b <= BAYS; b++) {
        const cx = -BW / 2 + b * BAY;
        const bm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, DEPTH), matSteel);
        bm.position.set(cx, yBase + FH, 0);
        bm.castShadow = true; floorGroup.add(bm); beams.push(bm);
      }

      const braces: THREE.Mesh[] = [];
      const bLen = Math.sqrt(BAY * BAY + FH * FH);
      const bAngle = Math.atan2(FH, BAY);
      for (const side of [-1, 1]) {
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, bLen, 6), matSteelDim);
        br.rotation.z = side * bAngle;
        br.position.set(side * (BW / 2 - BAY / 2), yBase + FH / 2, 0);
        floorGroup.add(br); braces.push(br);
      }

      const slab = new THREE.Mesh(new THREE.BoxGeometry(BW, 0.22, DEPTH), matSlab);
      slab.position.set(0, yBase + FH, 0);
      slab.receiveShadow = true; slab.scale.x = 0; slab.visible = false;
      floorGroup.add(slab);

      let shearWall: THREE.Mesh | null = null;
      if (f % 3 === 0) {
        shearWall = new THREE.Mesh(new THREE.BoxGeometry(BAY - 0.3, FH - 0.22, 0.3), matConcrete);
        shearWall.position.set(-BW / 2 + BAY / 2, yBase + FH / 2, -DEPTH / 2 + 0.15);
        shearWall.castShadow = true; shearWall.scale.y = 0; shearWall.visible = false;
        floorGroup.add(shearWall);
      }

      const glassPanels: THREE.Mesh[] = [];
      for (let b = 0; b < BAYS; b++) {
        const px = -BW / 2 + b * BAY + BAY / 2;
        for (const side of [-1, 1]) {
          const p = new THREE.Mesh(new THREE.BoxGeometry(BAY - 0.3, FH - 0.3, 0.08), matGlass);
          p.position.set(px, yBase + FH / 2, side * (DEPTH / 2));
          p.scale.y = 0; p.visible = false; floorGroup.add(p); glassPanels.push(p);
        }
        for (const side of [-1, 1]) {
          const sp = new THREE.Mesh(new THREE.BoxGeometry(0.08, FH - 0.3, DEPTH - 0.3), matGlass);
          sp.position.set(side * (BW / 2), yBase + FH / 2, 0);
          sp.scale.y = 0; sp.visible = false; floorGroup.add(sp); glassPanels.push(sp);
        }
      }

      const windowLights: THREE.PointLight[] = [];
      if (rand(f, 0) > 0.55) {
        const light = new THREE.PointLight("#f97316", 0, 6);
        light.position.set((rand(f, 1) - 0.5) * BW * 0.5, yBase + FH * 0.55, 0);
        floorGroup.add(light); windowLights.push(light);
      }

      floors.push({ columns, beams, braces, slab, shearWall, glassPanels, windowLights });
      columns.forEach(c => { c.scale.y = 0; c.visible = false; });
      beams.forEach(b => { b.scale.set(0, 1, 1); b.visible = false; });
      braces.forEach(b => { b.visible = false; });
    }
    mainWinLightsRef.current = floors.flatMap(el => el.windowLights);

    // ── Perimeter scaffold (front face + right side) ──────────────────────────
    const scaffoldGroup = new THREE.Group();
    buildingGroup.add(scaffoldGroup);

    const scaffFrontZ = -DEPTH / 2 - 0.7;  // front face offset
    const scaffRightX = BW / 2 + 0.7;      // right side offset
    const scaffoldFloors: THREE.Group[] = [];

    const stdGeo    = new THREE.CylinderGeometry(0.05, 0.05, FH, 5);
    const ledXGeo   = new THREE.BoxGeometry(3.0, 0.06, 0.06);
    const ledZGeo   = new THREE.BoxGeometry(0.06, 0.06, 3.0);
    const boardXGeo = new THREE.BoxGeometry(3.0, 0.05, 0.55);
    const diagScaffLen = Math.sqrt(3.0 ** 2 + FH ** 2);

    const frontXPositions = [-9, -6, -3, 0, 3, 6, 9];
    const sideZPositions  = [-3, 0, 3];

    for (let f = 0; f < FLOORS; f++) {
      const yBase = f * FH;
      const fg = new THREE.Group();
      fg.visible = false;
      scaffoldGroup.add(fg);
      scaffoldFloors.push(fg);

      // Front face: standards, ledgers, boards, occasional diagonal
      for (const sx of frontXPositions) {
        const std = new THREE.Mesh(stdGeo, matScaffoldTube);
        std.position.set(sx, yBase + FH / 2, scaffFrontZ);
        fg.add(std);
      }
      for (let i = 0; i < frontXPositions.length - 1; i++) {
        const lx = (frontXPositions[i] + frontXPositions[i + 1]) / 2;
        const led = new THREE.Mesh(ledXGeo, matScaffoldTube);
        led.position.set(lx, yBase + FH, scaffFrontZ);
        fg.add(led);
        const board = new THREE.Mesh(boardXGeo, matScaffoldBoard);
        board.position.set(lx, yBase + FH + 0.04, scaffFrontZ - 0.15);
        fg.add(board);
      }
      if (f % 2 === 0) {
        for (let i = 0; i < frontXPositions.length - 1; i += 2) {
          const diag = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, diagScaffLen, 4), matScaffoldTube
          );
          diag.position.set(
            (frontXPositions[i] + frontXPositions[i + 1]) / 2, yBase + FH / 2, scaffFrontZ
          );
          diag.rotation.z = (f % 4 === 0) ? Math.atan2(FH, 3) : -Math.atan2(FH, 3);
          fg.add(diag);
        }
      }

      // Right side face: standards, ledgers, boards
      for (const sz of sideZPositions) {
        const std = new THREE.Mesh(stdGeo, matScaffoldTube);
        std.position.set(scaffRightX, yBase + FH / 2, sz);
        fg.add(std);
      }
      for (let i = 0; i < sideZPositions.length - 1; i++) {
        const lz = (sideZPositions[i] + sideZPositions[i + 1]) / 2;
        const led = new THREE.Mesh(ledZGeo, matScaffoldTube);
        led.position.set(scaffRightX, yBase + FH, lz);
        fg.add(led);
        const board = new THREE.Mesh(boardXGeo, matScaffoldBoard);
        board.rotation.y = Math.PI / 2;
        board.position.set(scaffRightX + 0.15, yBase + FH + 0.04, lz);
        fg.add(board);
      }
    }

    // ── Jump-form climbing formwork ───────────────────────────────────────────
    // Positioned at core top height each frame. y=0 = current pour level.
    const jumpFormGroup = new THREE.Group();
    jumpFormGroup.visible = false;
    buildingGroup.add(jumpFormGroup);

    const coreHX = 2.0, coreHZ = 1.75;
    const platExt = 1.5;
    const platHX = coreHX + platExt;   // 3.5
    const platHZ = coreHZ + platExt;   // 3.25
    const platThick = 0.22;

    // Steel frame ring (4 bars around core opening)
    for (const [dx, dz, pw, pd] of [
      [0, -(coreHZ + platExt / 2), platHX * 2, platExt],
      [0,  (coreHZ + platExt / 2), platHX * 2, platExt],
      [-(coreHX + platExt / 2), 0, platExt, coreHZ * 2],
      [ (coreHX + platExt / 2), 0, platExt, coreHZ * 2],
    ] as [number, number, number, number][]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(pw, platThick, pd), matCraneAccent);
      bar.position.set(dx, platThick / 2, dz);
      jumpFormGroup.add(bar);
      // Plywood deck on top
      const deck = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.055, pd), matPlywood);
      deck.position.set(dx, platThick + 0.028, dz);
      jumpFormGroup.add(deck);
    }

    // Hydraulic jack yokes at 4 corners
    const jackGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.5, 8);
    for (const [jx, jz] of [
      [-platHX + 0.12, -platHZ + 0.12], [ platHX - 0.12, -platHZ + 0.12],
      [-platHX + 0.12,  platHZ - 0.12], [ platHX - 0.12,  platHZ - 0.12],
    ]) {
      const jack = new THREE.Mesh(jackGeo, matSteel);
      jack.position.set(jx, -0.75, jz);
      jumpFormGroup.add(jack);
      const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), matSteelDim);
      yoke.position.set(jx, 0.0, jz);
      jumpFormGroup.add(yoke);
    }

    // Form panels flush against core faces (phenolic plywood, brown-orange)
    for (const side of [-1, 1]) {
      const fpF = new THREE.Mesh(new THREE.BoxGeometry(coreHX * 2 - 0.1, FH + 0.25, 0.12), matFormPanel);
      fpF.position.set(0, (FH + 0.25) / 2, side * (coreHZ + 0.06));
      jumpFormGroup.add(fpF);
      const fpS = new THREE.Mesh(new THREE.BoxGeometry(0.12, FH + 0.25, coreHZ * 2 - 0.1), matFormPanel);
      fpS.position.set(side * (coreHX + 0.06), (FH + 0.25) / 2, 0);
      jumpFormGroup.add(fpS);
    }
    // Form panel tie rod holes (small cylinders on panel faces)
    for (let row = 0; row < 2; row++) {
      const ry = platThick + 0.8 + row * 1.2;
      for (let col = -1; col <= 1; col += 2) {
        const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 5), matSteelDim);
        tie.rotation.x = Math.PI / 2;
        tie.position.set(col * 0.8, ry, -(coreHZ + 0.06));
        jumpFormGroup.add(tie);
      }
    }

    // Guardrails around platform perimeter
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 5);
    const railH = platThick + 1.1;
    // Front and back rails
    for (const rz of [-platHZ, platHZ]) {
      for (let rx = -platHX; rx <= platHX + 0.01; rx += 1.4) {
        const post = new THREE.Mesh(postGeo, matSteel);
        post.position.set(rx, platThick + 0.55, rz);
        jumpFormGroup.add(post);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(platHX * 2, 0.05, 0.05), matSteel);
      rail.position.set(0, railH, rz);
      jumpFormGroup.add(rail);
      const midRail = new THREE.Mesh(new THREE.BoxGeometry(platHX * 2, 0.05, 0.05), matSteel);
      midRail.position.set(0, platThick + 0.6, rz);
      jumpFormGroup.add(midRail);
    }
    // Side rails
    for (const rx of [-platHX, platHX]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, coreHZ * 2), matSteel);
      rail.position.set(rx, railH, 0);
      jumpFormGroup.add(rail);
    }

    // Suspended lower deck (stripping level ~1.8u below platform)
    const stripY = -1.8;
    for (const [dx, dz, pw, pd] of [
      [0, -(coreHZ + 0.7), coreHX * 2 + 1.2, 0.9],
      [0,  (coreHZ + 0.7), coreHX * 2 + 1.2, 0.9],
      [-(coreHX + 0.7), 0, 0.9, coreHZ * 2],
      [ (coreHX + 0.7), 0, 0.9, coreHZ * 2],
    ] as [number, number, number, number][]) {
      const sd = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.055, pd), matScaffoldBoard);
      sd.position.set(dx, stripY, dz);
      jumpFormGroup.add(sd);
    }
    // Hanger rods
    for (const [hx, hz] of [
      [-platHX + 0.3, -platHZ + 0.3], [ platHX - 0.3, -platHZ + 0.3],
      [-platHX + 0.3,  platHZ - 0.3], [ platHX - 0.3,  platHZ - 0.3],
    ]) {
      const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 4), matSteel);
      hanger.position.set(hx, (platThick + stripY) / 2, hz);
      jumpFormGroup.add(hanger);
    }

    // Worker figures on jump-form platform
    makeWorker(jumpFormGroup, -2.5, platThick, -(coreHZ + 0.8),  0.8, matHardHatOrange);
    makeWorker(jumpFormGroup,  1.0, platThick,   coreHZ + 0.7,  -0.5, matHardHatWhite);
    makeWorker(jumpFormGroup,  platHX - 0.6, platThick, 0.4, 1.9, matHardHatYellow);

    // ── Lattice tower crane (Liebherr-style) ──────────────────────────────────
    const craneGroup = new THREE.Group();
    craneGroup.visible = false;
    scene.add(craneGroup);

    const mastH = FLOORS * FH + 4;   // 40u
    const mastX = -BW / 2 - 9;       // -19
    const MAST_H = 0.5;               // half-width of mast footprint
    const SEC_H = 3.0;
    const N_SEC = Math.ceil(mastH / SEC_H);

    // Shared mast geometry
    const mChordGeo = new THREE.CylinderGeometry(0.075, 0.075, SEC_H, 6);
    const mTieXGeo  = new THREE.BoxGeometry(MAST_H * 2, 0.06, 0.06);
    const mTieZGeo  = new THREE.BoxGeometry(0.06, 0.06, MAST_H * 2);

    for (let s = 0; s < N_SEC; s++) {
      const yBot = s * SEC_H;
      const yTop = Math.min(yBot + SEC_H, mastH);
      const yMid = (yBot + yTop) / 2;
      const secH = yTop - yBot;

      // 4 corner chord tubes
      for (const dx of [-MAST_H, MAST_H]) {
        for (const dz of [-MAST_H, MAST_H]) {
          const geo = secH < SEC_H - 0.01
            ? new THREE.CylinderGeometry(0.075, 0.075, secH, 6)
            : mChordGeo;
          const chord = new THREE.Mesh(geo, matCrane);
          chord.position.set(mastX + dx, yMid, dz);
          craneGroup.add(chord);
        }
      }

      // Horizontal tie bars at section top and bottom
      for (const y of [yBot, yTop]) {
        for (const dz of [-MAST_H, MAST_H]) {
          const tie = new THREE.Mesh(mTieXGeo, matCrane);
          tie.position.set(mastX, y, dz);
          craneGroup.add(tie);
        }
        for (const dx of [-MAST_H, MAST_H]) {
          const tie = new THREE.Mesh(mTieZGeo, matCrane);
          tie.position.set(mastX + dx, y, 0);
          craneGroup.add(tie);
        }
      }

      // X-diagonal braces on front/back faces (x-y plane)
      for (const dz of [-MAST_H, MAST_H]) {
        craneGroup.add(cylBetween(
          new THREE.Vector3(mastX - MAST_H, yBot, dz),
          new THREE.Vector3(mastX + MAST_H, yTop, dz), 0.04, matCraneAccent, 4));
        craneGroup.add(cylBetween(
          new THREE.Vector3(mastX + MAST_H, yBot, dz),
          new THREE.Vector3(mastX - MAST_H, yTop, dz), 0.04, matCraneAccent, 4));
      }
      // X-diagonal braces on left/right faces (z-y plane)
      for (const dx of [-MAST_H, MAST_H]) {
        craneGroup.add(cylBetween(
          new THREE.Vector3(mastX + dx, yBot, -MAST_H),
          new THREE.Vector3(mastX + dx, yTop,  MAST_H), 0.04, matCraneAccent, 4));
        craneGroup.add(cylBetween(
          new THREE.Vector3(mastX + dx, yBot,  MAST_H),
          new THREE.Vector3(mastX + dx, yTop, -MAST_H), 0.04, matCraneAccent, 4));
      }
    }

    // Climbing collar (steel ring at mast mid-height)
    const collarY = mastH * 0.6;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.4, 16, 1, true), matSteelDim);
    collar.position.set(mastX, collarY, 0);
    craneGroup.add(collar);

    // Slewing ring / turntable
    const slewRing = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.38, 16), matSteelDim);
    slewRing.position.set(mastX, mastH + 0.19, 0);
    craneGroup.add(slewRing);

    // Machinery/hoist deck
    const hoistDeck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.38, 2.0), matCraneAccent);
    hoistDeck.position.set(mastX, mastH + 0.57, 0);
    craneGroup.add(hoistDeck);

    // Hoist drum on counter-jib side
    const hoistDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.3, 10), matSteelDim);
    hoistDrum.rotation.z = Math.PI / 2;
    hoistDrum.position.set(mastX - 0.9, mastH + 0.85, 0);
    craneGroup.add(hoistDrum);

    // Operator cab (overhangs jib side)
    const jibTopY = mastH + 0.57;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.1, 2.0), matCrane);
    cab.position.set(mastX + 1.7, jibTopY + 1.05, 0);
    craneGroup.add(cab);
    // Cab glass window (front face)
    const cabWin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.3, 1.6), matCabGlass);
    cabWin.position.set(mastX + 2.95, jibTopY + 1.15, 0);
    craneGroup.add(cabWin);
    // Cab access ladder side
    const cabLadder = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 0.06), matSteelDim);
    cabLadder.position.set(mastX + 0.6, jibTopY + 1.05, 0.7);
    craneGroup.add(cabLadder);

    // Cat-head A-frame (4 legs meeting at apex)
    const catApex = new THREE.Vector3(mastX, mastH + 5.8, 0);
    const catBase = mastH + 0.57;
    for (const [dx, dz] of [[-MAST_H, -MAST_H], [MAST_H, -MAST_H], [-MAST_H, MAST_H], [MAST_H, MAST_H]]) {
      const legBase = new THREE.Vector3(mastX + dx, catBase, dz);
      craneGroup.add(cylBetween(legBase, catApex, 0.09, matCrane, 6));
    }
    // Horizontal tie between cat-head legs at mid-height
    for (const [az, bz] of [[-MAST_H * 0.5, MAST_H * 0.5]] as [number, number][]) {
      const midH = (catBase + catApex.y) * 0.5 - 0.5;
      craneGroup.add(cylBetween(
        new THREE.Vector3(mastX - 0.3, midH, az),
        new THREE.Vector3(mastX + 0.3, midH, bz), 0.05, matCrane, 4));
    }

    // ─── Jib (lattice truss in +x direction) ─────────────────────────────────
    const jibLen = 30;
    const jibStartX = mastX + MAST_H;
    const jibEndX   = mastX + jibLen;
    const jibTopY_c = jibTopY + 0.19;   // chord top y
    const jibBotY_c = jibTopY_c - 0.58; // chord bottom y

    // Top chord
    const jtLen = jibEndX - jibStartX;
    const jibTop = new THREE.Mesh(new THREE.BoxGeometry(jtLen, 0.12, 0.12), matCrane);
    jibTop.position.set(jibStartX + jtLen / 2, jibTopY_c, 0);
    craneGroup.add(jibTop);

    // Bottom chord
    const jibBot = new THREE.Mesh(new THREE.BoxGeometry(jtLen, 0.12, 0.12), matCrane);
    jibBot.position.set(jibStartX + jtLen / 2, jibBotY_c, 0);
    craneGroup.add(jibBot);

    // Lateral side tubes (top and bottom, z offset)
    for (const dz of [-0.18, 0.18]) {
      const ts = new THREE.Mesh(new THREE.BoxGeometry(jtLen, 0.07, 0.07), matCrane);
      ts.position.set(jibStartX + jtLen / 2, (jibTopY_c + jibBotY_c) / 2, dz);
      craneGroup.add(ts);
    }

    // Web: vertical + diagonal members every 3u
    const jibSpan = 3.0;
    const webGeo = new THREE.BoxGeometry(0.07, Math.abs(jibTopY_c - jibBotY_c), 0.07);
    for (let i = 0; i * jibSpan <= jtLen; i++) {
      const wx = jibStartX + i * jibSpan;
      if (wx > jibEndX) break;
      const web = new THREE.Mesh(webGeo, matCraneAccent);
      web.position.set(wx, (jibTopY_c + jibBotY_c) / 2, 0);
      craneGroup.add(web);
      if (i < Math.floor(jtLen / jibSpan)) {
        const nx = wx + jibSpan;
        if (nx <= jibEndX) {
          craneGroup.add(cylBetween(
            new THREE.Vector3(wx, jibBotY_c, 0), new THREE.Vector3(nx, jibTopY_c, 0),
            0.038, matCraneAccent, 4));
        }
      }
    }

    // ─── Counter-jib (lattice, -x direction) ─────────────────────────────────
    const cjLen = 10;
    const cjStartX = mastX - MAST_H;
    const cjEndX   = mastX - cjLen;
    const cjLen2 = cjStartX - cjEndX;

    const cjTop = new THREE.Mesh(new THREE.BoxGeometry(cjLen2, 0.12, 0.12), matCrane);
    cjTop.position.set(cjStartX - cjLen2 / 2, jibTopY_c, 0);
    craneGroup.add(cjTop);
    const cjBot = new THREE.Mesh(new THREE.BoxGeometry(cjLen2, 0.12, 0.12), matCrane);
    cjBot.position.set(cjStartX - cjLen2 / 2, jibBotY_c, 0);
    craneGroup.add(cjBot);

    for (let i = 0; i * jibSpan <= cjLen2; i++) {
      const wx = cjStartX - i * jibSpan;
      if (wx < cjEndX) break;
      const web = new THREE.Mesh(webGeo, matCraneAccent);
      web.position.set(wx, (jibTopY_c + jibBotY_c) / 2, 0);
      craneGroup.add(web);
    }

    // Counterweights at end of counter-jib (3 stacked slabs)
    let cwY = jibBotY_c - 0.06;
    for (const [cw, ch, cd] of [[3.6, 1.2, 1.8], [3.2, 1.0, 1.5], [2.8, 0.8, 1.3]]) {
      const cwMesh = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cd), matCounterweight);
      cwMesh.position.set(cjEndX + cw / 2 + 0.25, cwY - ch / 2, 0);
      cwY -= ch;
      craneGroup.add(cwMesh);
    }

    // ─── Pendant cables ───────────────────────────────────────────────────────
    const pendMat = new THREE.LineBasicMaterial({ color: "#c8b830" });
    // Main pendants: apex → jib tip (two parallel)
    for (const dz of [-0.14, 0.14]) {
      craneGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(catApex.x, catApex.y, dz),
          new THREE.Vector3(jibEndX, jibTopY_c, dz),
        ]), pendMat));
    }
    // Back-stays: apex → counter-jib tip
    craneGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(catApex.x, catApex.y, 0),
        new THREE.Vector3(cjEndX, jibTopY_c, 0),
      ]), pendMat));
    // Intermediate jib supports (divide jib into thirds)
    for (const frac of [1/3, 2/3]) {
      const px = jibStartX + jtLen * frac;
      craneGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(catApex.x, catApex.y, 0),
          new THREE.Vector3(px, jibTopY_c, 0),
        ]), pendMat));
    }

    // ─── Trolley + hook block ─────────────────────────────────────────────────
    const trolleyX = mastX + jibLen * 0.42;
    const trolleyGrp = new THREE.Group();
    craneGroup.add(trolleyGrp);

    // Trolley body + wheels
    const trolleyBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.32, 0.88), matCrane);
    trolleyBody.position.set(trolleyX, jibBotY_c - 0.16, 0);
    trolleyGrp.add(trolleyBody);

    for (const [wx, wz] of [[-0.28, 0.2], [0.28, 0.2], [-0.28, -0.2], [0.28, -0.2]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.11, 8), matSteelDim);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(trolleyX + wx, jibBotY_c, wz);
      trolleyGrp.add(wheel);
    }

    // Hook cable + block
    const hookDepth = 12;
    const hookWireGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(trolleyX, jibBotY_c - 0.32, 0),
      new THREE.Vector3(trolleyX, jibBotY_c - 0.32 - hookDepth, 0),
    ]);
    trolleyGrp.add(new THREE.Line(hookWireGeo, new THREE.LineBasicMaterial({ color: "#888888" })));

    const hookBlockGrp = new THREE.Group();
    hookBlockGrp.position.set(trolleyX, jibBotY_c - 0.32 - hookDepth, 0);
    for (const dz of [-0.2, 0.2]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.06), matSteelDim);
      plate.position.set(0, 0, dz);
      hookBlockGrp.add(plate);
    }
    const sheave = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 10), matSteel);
    sheave.rotation.x = Math.PI / 2;
    hookBlockGrp.add(sheave);
    // Hook (half-torus C-shape)
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.065, 8, 12, Math.PI), matSteel);
    hook.position.set(0, -0.3, 0);
    hookBlockGrp.add(hook);
    trolleyGrp.add(hookBlockGrp);

    // Return rope
    trolleyGrp.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(trolleyX + 0.14, jibBotY_c - 0.32 - hookDepth, 0),
        new THREE.Vector3(trolleyX + 0.14, jibBotY_c - 0.32, 0),
      ]),
      new THREE.LineBasicMaterial({ color: "#888888" })
    ));

    // Crane warning light on cat-head apex
    const warnLight = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), matAmber);
    warnLight.position.copy(catApex).setY(catApex.y + 0.3);
    craneGroup.add(warnLight);

    // ── Roof parapet & equipment ───────────────────────────────────────────────
    const roofGroup = new THREE.Group();
    roofGroup.visible = false;
    buildingGroup.add(roofGroup);

    const roofParapet = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.8, 0.9, DEPTH + 0.8), matConcreteLight);
    roofParapet.position.set(0, FLOORS * FH + 0.45, 0);
    roofGroup.add(roofParapet);
    const hvac1 = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 2), matSlab);
    hvac1.position.set(-4, FLOORS * FH + 1.35, 0.5); roofGroup.add(hvac1);
    const hvac2 = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 1.8), matSlab);
    hvac2.position.set(5, FLOORS * FH + 0.9, -1); roofGroup.add(hvac2);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), matSteelDim);
    antenna.position.set(0, FLOORS * FH + 2.1, 0); roofGroup.add(antenna);
    const antennaLight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), matAmber);
    antennaLight.position.set(0, FLOORS * FH + 3.75, 0); roofGroup.add(antennaLight);

    // ── Rooftop LED sign ──────────────────────────────────────────────────────
    const signW = BW * 0.78;
    const signH = 2.6;
    const signY = FLOORS * FH + 2.0;
    const signZ = DEPTH / 2 + 0.22;

    // Step 1: render text at 1px-per-LED into tiny offscreen canvas
    const LED_COLS = 130, LED_ROWS = 22;
    const LED_DOT  = 5,   LED_GAP  = 2,  LED_CELL = LED_DOT + LED_GAP;

    const ledSample = document.createElement("canvas");
    ledSample.width = LED_COLS; ledSample.height = LED_ROWS;
    const ls = ledSample.getContext("2d")!;
    ls.fillStyle = "#000";
    ls.fillRect(0, 0, LED_COLS, LED_ROWS);
    ls.fillStyle = "#fff";
    ls.font = "bold 12px 'Courier New', monospace";
    ls.textAlign = "center";
    ls.textBaseline = "top";
    ls.fillText("CORE STRUCTURES", LED_COLS / 2, 1);
    ls.font = "bold 5px 'Courier New', monospace";
    ls.fillText("WE BUILD THE FUTURE", LED_COLS / 2, 14);
    const ledPx = ls.getImageData(0, 0, LED_COLS, LED_ROWS).data;

    // Step 2: draw each LED as its own radial-gradient dot
    const signCv = document.createElement("canvas");
    signCv.width  = LED_COLS * LED_CELL;
    signCv.height = LED_ROWS * LED_CELL;
    const sc = signCv.getContext("2d")!;

    sc.fillStyle = "#050403";
    sc.fillRect(0, 0, signCv.width, signCv.height);

    for (let row = 0; row < LED_ROWS; row++) {
      for (let col = 0; col < LED_COLS; col++) {
        const bright = ledPx[(row * LED_COLS + col) * 4] / 255;
        const cx = col * LED_CELL + LED_CELL / 2;
        const cy = row * LED_CELL + LED_CELL / 2;
        const r  = LED_DOT / 2;

        if (bright > 0.12) {
          // Outer glow halo (larger than the dot)
          const halo = sc.createRadialGradient(cx, cy, 0, cx, cy, r * 3.2);
          halo.addColorStop(0,   `rgba(255, 120, 30, ${bright * 0.55})`);
          halo.addColorStop(0.5, `rgba(255, 80,  10, ${bright * 0.18})`);
          halo.addColorStop(1,   "rgba(200, 60, 0, 0)");
          sc.fillStyle = halo;
          sc.beginPath();
          sc.arc(cx, cy, r * 3.2, 0, Math.PI * 2);
          sc.fill();

          // LED lens — hot white-yellow centre, deep orange edge
          const lens = sc.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 0, cx, cy, r);
          lens.addColorStop(0,    `rgba(255, 230, 160, ${bright})`);
          lens.addColorStop(0.38, `rgba(255, 120,  25, ${bright})`);
          lens.addColorStop(1,    `rgba(180,  50,   0, ${bright * 0.85})`);
          sc.fillStyle = lens;
          sc.beginPath();
          sc.arc(cx, cy, r, 0, Math.PI * 2);
          sc.fill();
        } else {
          // Unlit LED — warm very dark circle
          sc.fillStyle = "#160c06";
          sc.beginPath();
          sc.arc(cx, cy, r, 0, Math.PI * 2);
          sc.fill();
        }
      }
    }

    const signTex = new THREE.CanvasTexture(signCv);
    textures.push(signTex);

    // Steel backing frame
    const signFrame = new THREE.Mesh(
      new THREE.BoxGeometry(signW + 0.5, signH + 0.4, 0.28),
      new THREE.MeshStandardMaterial({ color: "#0e0e10", roughness: 0.88, metalness: 0.45 })
    );
    signFrame.position.set(0, signY, signZ - 0.05);
    roofGroup.add(signFrame);

    // Emissive LED panel
    const signPanel = new THREE.Mesh(
      new THREE.BoxGeometry(signW, signH, 0.06),
      new THREE.MeshStandardMaterial({
        map: signTex,
        emissiveMap: signTex,
        emissive: new THREE.Color("#f97316"),
        emissiveIntensity: 3.5,
        roughness: 1, metalness: 0,
      })
    );
    signPanel.position.set(0, signY, signZ + 0.09);
    roofGroup.add(signPanel);

    // Orange halo point light in front of sign
    const signLight = new THREE.PointLight("#f97316", 4, 18);
    signLight.position.set(0, signY, signZ + 2.5);
    roofGroup.add(signLight);

    // Mounting brackets
    for (const bx of [-signW * 0.38, 0, signW * 0.38]) {
      const bracket = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.55, 0.32),
        matSteelDim
      );
      bracket.position.set(bx, FLOORS * FH + 0.92, DEPTH / 2 + 0.14);
      roofGroup.add(bracket);
    }

    const siteLightMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), matAmber);
    siteLightMesh.position.set(0, 0.5, DEPTH / 2 + 1); siteLightMesh.visible = false;
    buildingGroup.add(siteLightMesh);
    const sitePointLight = new THREE.PointLight("#f97316", 0, 20);
    sitePointLight.position.copy(siteLightMesh.position);
    buildingGroup.add(sitePointLight);

    // ── Scene update ──────────────────────────────────────────────────────────
    const updateScene = (p: number) => {
      const foundation = clamp01(p / 0.1);
      const frame      = clamp01((p - 0.08) / 0.4);
      const slabs      = clamp01((p - 0.42) / 0.3);
      const facade     = clamp01((p - 0.68) / 0.28);
      const finish     = clamp01((p - 0.94) / 0.06);
      const craneIn    = clamp01((p - 0.05) / 0.04);
      const craneOut   = 1 - clamp01((p - 0.86) / 0.06);
      const craneOpacity = Math.min(craneIn, craneOut);

      pit.visible = foundation > 0;
      foundationSlab.scale.y = clamp01((foundation - 0.4) / 0.6);
      pileCaps.forEach(c => { c.visible = foundation > 0.75; });

      // Core + jump-form
      const coreFloors = Math.min(frame * FLOORS + (frame > 0 ? 1.5 : 0), FLOORS);
      const coreFrac = clamp01(coreFloors / FLOORS);
      coreGroup.scale.y = coreFrac;
      jumpFormGroup.position.y = coreFrac * FLOORS * FH;
      jumpFormGroup.visible = frame > 0.03 && frame < 0.97;

      // Crane opacity
      craneGroup.visible = craneOpacity > 0.01;
      if (craneOpacity < 0.999) {
        craneGroup.traverse(child => {
          const m = (child as THREE.Mesh).material;
          if (m && !Array.isArray(m)) {
            const sm = m as THREE.MeshStandardMaterial;
            if (sm.transparent !== undefined) { sm.transparent = true; sm.opacity = craneOpacity; }
          }
        });
      }

      // Site light
      const siteWork = Math.min(clamp01(p / 0.06), 1 - facade * 0.8);
      siteLightMesh.visible = siteWork > 0.05;
      sitePointLight.intensity = siteWork * 2.0;

      // Scaffold: rises with frame, removed as facade completes
      const visFloors = Math.round(frame * FLOORS);
      scaffoldFloors.forEach((sf, i) => { sf.visible = i < visFloors && facade < 0.92; });

      const builtFloors  = frame * FLOORS;
      const slabFloors   = slabs * FLOORS;
      const facadeFloors = facade * FLOORS;

      floors.forEach((el, f) => {
        const fp  = clamp01(builtFloors - f);
        const sp  = clamp01(slabFloors - f);
        const fap = clamp01(facadeFloors - f);

        el.columns.forEach(c => { c.visible = fp > 0.01; c.scale.y = fp; c.position.y = f * FH + (FH * fp) / 2; });
        el.beams.forEach(b => { b.visible = fp >= 1; b.scale.x = fp >= 1 ? 1 : 0; b.scale.z = fp >= 1 ? 1 : 0; });
        el.braces.forEach(b => { b.visible = fp >= 1; });
        el.slab.visible = sp > 0.01; el.slab.scale.x = sp;
        if (el.shearWall) { el.shearWall.visible = sp > 0.01; el.shearWall.scale.y = sp >= 1 ? 1 : sp * 0.8; }
        el.glassPanels.forEach(panel => { panel.visible = fap > 0.01; panel.scale.y = fap; });
        el.windowLights.forEach(light => {
          if (!isDarkModeRef.current) {
            light.intensity = finish * (0.3 + rand(f, 9) * 0.4) * 2;
          }
        });
      });

      roofGroup.visible = finish > 0;
      roofGroup.scale.y = finish;

      // Vehicles
      excavatorGroup.visible = p < 0.18;
      mixerGroup.visible     = p > 0.12 && p < 0.78;
      dumpGroup.visible      = p < 0.45;
      groundWorkers.forEach(({ group, pMin, pMax }) => {
        group.visible = p >= pMin && p <= pMax;
      });

      // Camera orbit + continuous zoom
      const targetAz = (Math.PI / 3) * (1 - p) + (Math.PI / 7.2) * p;
      camAzimuth += (targetAz - camAzimuth) * 0.08;
      const dist = 55 - p * 22;
      camera.position.set(Math.sin(camAzimuth) * dist, camHeight - p * 4, Math.cos(camAzimuth) * dist);
      camera.lookAt(0, 10 + Math.pow(p, 0.4) * 22, 0);
      camera.fov = 45 - p * 4;
      camera.updateProjectionMatrix();

      needsRender = true;
    };

    // ── Night-only objects (hidden until night mode activates) ────────────────
    // Stars
    const starGeo = new THREE.BufferGeometry();
    const STAR_COUNT = 1600;
    const starPos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 250 + Math.random() * 30;
      starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi));
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: "#ffffff", size: 0.9, sizeAttenuation: true, transparent: true, opacity: 0 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    starsRef.current = stars;

    // Moon
    const moonMat = new THREE.MeshStandardMaterial({ color: "#d4dde8", roughness: 0.88, emissive: new THREE.Color("#c0cce0"), emissiveIntensity: 0 });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), moonMat);
    moon.position.set(-110, 170, -180);
    scene.add(moon);
    moonRef.current = moon;

    // Bridge: lets the night-mode useEffect mark the local needsRender flag dirty
    markDirtyRef.current = () => { needsRender = true; };

    // ── Render loop ───────────────────────────────────────────────────────────
    let needsRender = true;
    let animId = 0;
    const render = () => {
      animId = requestAnimationFrame(render);
      if (!needsRender) return;
      needsRender = false;
      composer.render();
    };
    render();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      bloom.resolution.set(window.innerWidth, window.innerHeight);
      needsRender = true;
    };
    window.addEventListener("resize", onResize);

    const playhead = { progress: reduceMotion ? 1 : 0 };
    updateScene(playhead.progress);
    setReady(true);

    let tween: gsap.core.Tween | undefined;
    if (!reduceMotion) {
      tween = gsap.to(playhead, {
        progress: 1,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          invalidateOnRefresh: true,
        },
        onUpdate: () => updateScene(playhead.progress),
      });
    }

    const onVisibility = () => { if (!document.hidden) needsRender = true; };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      tween?.scrollTrigger?.kill();
      tween?.kill();
      textures.forEach(t => t.dispose());
      composer.dispose();
      renderer.dispose();
      wrap.removeChild(renderer.domElement);
    };
  }, []);

  // ── Night mode transitions ─────────────────────────────────────────────────
  useEffect(() => {
    isDarkModeRef.current = isDarkMode;
    const dirty = () => markDirtyRef.current?.();
    const dur = 1.5;
    const ease = "power2.inOut";

    const ambientL = ambientRef.current;
    const hemiL    = hemiRef.current;
    const sunL     = sunRef.current;
    const fillL    = fillRef.current;
    const bloomP   = bloomRef.current;
    const fog      = fogRef.current;
    const ren      = rendererRef.current;
    const starsO   = starsRef.current;
    const moonO    = moonRef.current;
    const sceneO   = sceneRef.current;

    if (!ambientL || !hemiL || !sunL || !fillL || !bloomP) return;

    if (isDarkMode) {
      if (sceneO) sceneO.background = new THREE.Color("#030818");
      if (fog) {
        const fp = { r: fog.color.r, g: fog.color.g, b: fog.color.b };
        gsap.to(fp, { r: 0.05, g: 0.04, b: 0.18, duration: dur, ease, onUpdate: () => { fog.color.setRGB(fp.r, fp.g, fp.b); dirty(); } });
      }
      gsap.to(ambientL, { intensity: 0.05, duration: dur, ease, onUpdate: dirty });
      gsap.to(hemiL.color,       { r: 0.16, g: 0.20, b: 0.36, duration: dur, ease, onUpdate: dirty });
      gsap.to(hemiL.groundColor, { r: 0.35, g: 0.16, b: 0.04, duration: dur, ease, onUpdate: dirty });
      gsap.to(hemiL, { intensity: 0.3, duration: dur, ease, onUpdate: dirty });
      sunL.position.set(-80, 120, -60);
      gsap.to(sunL.color, { r: 0.72, g: 0.80, b: 1.0, duration: dur, ease, onUpdate: dirty });
      gsap.to(sunL, { intensity: 0.28, duration: dur, ease, onUpdate: dirty });
      gsap.to(fillL, { intensity: 0.04, duration: dur, ease, onUpdate: dirty });
      gsap.to(bloomP, { strength: 0.7, threshold: 0.10, duration: dur, ease, onUpdate: dirty });
      if (ren) {
        const p = { e: ren.toneMappingExposure };
        gsap.to(p, { e: 0.36, duration: dur, ease, onUpdate: () => { ren.toneMappingExposure = p.e; dirty(); } });
      }
      if (starsO) gsap.to(starsO.material as THREE.PointsMaterial, { opacity: 0.9, duration: dur * 1.3, ease, onUpdate: dirty });
      if (moonO)  gsap.to(moonO.material as THREE.MeshStandardMaterial, { emissiveIntensity: 1.3, duration: dur, ease, onUpdate: dirty });
      // Window bulbs: just toggle visibility (emissive meshes, zero light overhead)
      if (nightLightsGroupRef.current) { nightLightsGroupRef.current.visible = true; dirty(); }
      mainWinLightsRef.current.forEach(l => {
        gsap.to(l, { intensity: 1.0 + Math.random() * 0.8, duration: 0.15 + Math.random() * 0.5, ease: "power1.out", onUpdate: dirty });
      });
    } else {
      if (sceneO) sceneO.background = new THREE.Color("#000000");
      if (fog) {
        const fp = { r: fog.color.r, g: fog.color.g, b: fog.color.b };
        gsap.to(fp, { r: 0.69, g: 0.78, b: 0.85, duration: dur, ease, onUpdate: () => { fog.color.setRGB(fp.r, fp.g, fp.b); dirty(); } });
      }
      gsap.to(ambientL, { intensity: 0.3, duration: dur, ease, onUpdate: dirty });
      gsap.to(hemiL.color,       { r: 0.53, g: 0.81, b: 0.92, duration: dur, ease, onUpdate: dirty });
      gsap.to(hemiL.groundColor, { r: 0.55, g: 0.45, b: 0.33, duration: dur, ease, onUpdate: dirty });
      gsap.to(hemiL, { intensity: 0.55, duration: dur, ease, onUpdate: dirty });
      sunL.position.setFromSphericalCoords(100, THREE.MathUtils.degToRad(38), THREE.MathUtils.degToRad(195));
      gsap.to(sunL.color, { r: 1.0, g: 0.91, b: 0.75, duration: dur, ease, onUpdate: dirty });
      gsap.to(sunL, { intensity: 1.8, duration: dur, ease, onUpdate: dirty });
      gsap.to(fillL, { intensity: 0.5, duration: dur, ease, onUpdate: dirty });
      gsap.to(bloomP, { strength: 0.18, threshold: 0.88, duration: dur, ease, onUpdate: dirty });
      if (ren) {
        const p = { e: ren.toneMappingExposure };
        gsap.to(p, { e: 0.55, duration: dur, ease, onUpdate: () => { ren.toneMappingExposure = p.e; dirty(); } });
      }
      if (starsO) gsap.to(starsO.material as THREE.PointsMaterial, { opacity: 0, duration: dur, ease, onUpdate: dirty });
      if (moonO)  gsap.to(moonO.material as THREE.MeshStandardMaterial, { emissiveIntensity: 0, duration: dur, ease, onUpdate: dirty });
      if (nightLightsGroupRef.current) { nightLightsGroupRef.current.visible = false; dirty(); }
      mainWinLightsRef.current.forEach(l => {
        gsap.to(l, { intensity: 0, duration: 0.4, ease, onUpdate: dirty });
      });
    }
  }, [isDarkMode]);

  return (
    <div ref={wrapRef} className="fixed inset-0 z-0" aria-hidden="true">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#07090d]/85 via-[#07090d]/35 to-transparent" />
      <div
        className={`absolute inset-0 bg-[#07090d] transition-opacity duration-700 ${
          ready ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
}
