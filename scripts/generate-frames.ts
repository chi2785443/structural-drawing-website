/**
 * Generates the scroll-scrub image sequence: a mid-rise tower under
 * construction, rendered as SVG at 120 progress stages and rasterized
 * to WebP. Frames are drop-in replaceable with real renders later
 * (same filenames, same count).
 *
 * Run: npm run frames
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const FRAMES = 120;
const W = 1440;
const H = 1080;
const OUT_DIR = path.join(process.cwd(), "public", "frames");

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
// deterministic pseudo-random in [0,1) from integer seeds
const rand = (a: number, b: number) => {
  const x = Math.sin(a * 374761.393 + b * 668265.263) * 43758.5453;
  return x - Math.floor(x);
};

// ---- scene geometry -------------------------------------------------
const GROUND = 962;
const BX = 770; // building left
const BW = 430; // building width
const FLOORS = 12;
const FH = 54; // floor height
const BAYS = 5;
const BAY = BW / BAYS;
const TOP = GROUND - FLOORS * FH; // y of finished roof slab

// palette: blueprint at dusk
const C = {
  skyTop: "#0b1220",
  skyMid: "#101b30",
  horizon: "#1b2a45",
  silhouette: "#0e1729",
  ground: "#0a0f1a",
  steel: "#8da3bf",
  steelDim: "#5d7290",
  concrete: "#3c4759",
  concreteLight: "#4d596e",
  slab: "#2a3650",
  glass: "#16243d",
  glassEdge: "#33486b",
  amber: "#e8a33d",
  crane: "#c2cede",
  pit: "#070b13",
};

function buildingSVG(p: number): string {
  // phase sub-progress
  const foundation = clamp01(p / 0.1);
  const frame = clamp01((p - 0.08) / 0.4); // structural frame rises
  const slabs = clamp01((p - 0.42) / 0.3); // slabs + shear walls
  const facade = clamp01((p - 0.68) / 0.28); // curtain wall climbs
  const finish = clamp01((p - 0.94) / 0.06); // roof, lights
  const craneIn = clamp01((p - 0.05) / 0.04);
  const craneOut = 1 - clamp01((p - 0.86) / 0.06);
  const craneOpacity = Math.min(craneIn, craneOut);

  const parts: string[] = [];

  // sky + faint blueprint grid
  parts.push(`
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.skyTop}"/>
      <stop offset="0.62" stop-color="${C.skyMid}"/>
      <stop offset="1" stop-color="${C.horizon}"/>
    </linearGradient>
    <linearGradient id="glassg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1d3050"/>
      <stop offset="1" stop-color="${C.glass}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  for (let gx = 0; gx <= W; gx += 80)
    parts.push(`<line x1="${gx}" y1="0" x2="${gx}" y2="${H}" stroke="#2a3b5c" stroke-opacity="0.07"/>`);
  for (let gy = 0; gy <= H; gy += 80)
    parts.push(`<line x1="0" y1="${gy}" x2="${W}" y2="${gy}" stroke="#2a3b5c" stroke-opacity="0.07"/>`);

  // background skyline silhouettes (static)
  const sky: [number, number, number][] = [
    [40, 180, 300], [200, 140, 380], [330, 110, 230], [470, 170, 330],
    [620, 90, 200], [1230, 150, 360], [1330, 100, 250],
  ];
  for (const [x, w, h] of sky)
    parts.push(`<rect x="${x}" y="${GROUND - h}" width="${w}" height="${h}" fill="${C.silhouette}"/>`);

  // ground
  parts.push(`<rect x="0" y="${GROUND}" width="${W}" height="${H - GROUND}" fill="${C.ground}"/>`);
  parts.push(`<line x1="0" y1="${GROUND}" x2="${W}" y2="${GROUND}" stroke="#243556" stroke-width="2" stroke-opacity="0.6"/>`);

  // ---- foundation ----------------------------------------------------
  if (foundation > 0) {
    const pitW = BW + 80;
    const pitD = 46 * foundation;
    parts.push(`<rect x="${BX - 40}" y="${GROUND}" width="${pitW}" height="${pitD}" fill="${C.pit}"/>`);
    // foundation slab rises within the pit
    const slabH = 26 * clamp01((foundation - 0.4) / 0.6);
    if (slabH > 0)
      parts.push(`<rect x="${BX - 24}" y="${GROUND + 40 - slabH}" width="${BW + 48}" height="${slabH}" fill="${C.concrete}"/>`);
    // pile caps
    if (foundation > 0.75) {
      for (let b = 0; b <= BAYS; b++) {
        const cx = BX + b * BAY;
        parts.push(`<rect x="${cx - 14}" y="${GROUND + 4}" width="28" height="12" fill="${C.concreteLight}"/>`);
      }
    }
  }

  // ---- concrete core (leads the frame by ~1.5 floors) ---------------
  const coreFloors = Math.min(frame * FLOORS + (frame > 0 ? 1.5 : 0), FLOORS + 0.6);
  if (coreFloors > 0) {
    const coreH = coreFloors * FH;
    const coreX = BX + 2.5 * BAY - 38;
    parts.push(`<rect x="${coreX}" y="${GROUND - coreH}" width="76" height="${coreH}" fill="${C.concrete}"/>`);
    parts.push(`<rect x="${coreX}" y="${GROUND - coreH}" width="76" height="${coreH}" fill="none" stroke="${C.concreteLight}" stroke-width="1.5"/>`);
    // climb-form rig on top of core while building
    if (frame > 0.02 && frame < 0.98)
      parts.push(`<rect x="${coreX - 6}" y="${GROUND - coreH - 14}" width="88" height="14" fill="${C.amber}" opacity="0.85"/>`);
  }

  // ---- structural frame, floor by floor ------------------------------
  const builtFloors = frame * FLOORS;
  for (let f = 0; f < FLOORS; f++) {
    const fp = clamp01(builtFloors - f); // this floor's own progress
    if (fp <= 0) break;
    const y0 = GROUND - f * FH; // bottom of this storey
    const colH = FH * fp;
    // columns
    for (let b = 0; b <= BAYS; b++) {
      const cx = BX + b * BAY;
      parts.push(`<line x1="${cx}" y1="${y0}" x2="${cx}" y2="${y0 - colH}" stroke="${C.steel}" stroke-width="5"/>`);
    }
    if (fp >= 1) {
      // beam line across the top of the storey
      parts.push(`<line x1="${BX}" y1="${y0 - FH}" x2="${BX + BW}" y2="${y0 - FH}" stroke="${C.steel}" stroke-width="4"/>`);
      // diagonal bracing in outer bays
      parts.push(`<line x1="${BX}" y1="${y0}" x2="${BX + BAY}" y2="${y0 - FH}" stroke="${C.steelDim}" stroke-width="2"/>`);
      parts.push(`<line x1="${BX + BW}" y1="${y0}" x2="${BX + BW - BAY}" y2="${y0 - FH}" stroke="${C.steelDim}" stroke-width="2"/>`);
    }
  }

  // ---- slabs + shear walls -------------------------------------------
  const slabFloors = slabs * FLOORS;
  for (let f = 0; f < FLOORS; f++) {
    if (slabFloors - f <= 0) break;
    const fp = clamp01(slabFloors - f);
    const yTop = GROUND - (f + 1) * FH;
    // slab plate at the top of the storey, grows from the core outward
    const half = (BW / 2) * fp;
    const cx = BX + BW / 2;
    parts.push(`<rect x="${cx - half}" y="${yTop}" width="${half * 2}" height="9" fill="${C.slab}"/>`);
    if (fp >= 1) {
      // shear wall infill on the left bay, every third floor
      if (f % 3 === 0)
        parts.push(`<rect x="${BX + 2}" y="${yTop + 9}" width="${BAY - 4}" height="${FH - 9}" fill="${C.concrete}" opacity="0.8"/>`);
    }
  }

  // ---- facade / curtain wall, climbs bottom-up ------------------------
  const facadeFloors = facade * FLOORS;
  for (let f = 0; f < FLOORS; f++) {
    if (facadeFloors - f <= 0) break;
    const fp = clamp01(facadeFloors - f);
    const y0 = GROUND - f * FH;
    for (let b = 0; b < BAYS; b++) {
      // panels attach bay by bay within the floor
      if (fp * BAYS - b <= 0) break;
      const px = BX + b * BAY;
      parts.push(`<rect x="${px + 2}" y="${y0 - FH + 2}" width="${BAY - 4}" height="${FH - 4}" fill="url(#glassg)" stroke="${C.glassEdge}" stroke-width="1"/>`);
      // lit windows appear only at the finish, deterministic pattern
      if (finish > 0 && rand(f, b) > 0.55) {
        parts.push(`<rect x="${px + 8}" y="${y0 - FH + 10}" width="${BAY - 16}" height="${FH - 22}" fill="${C.amber}" opacity="${(0.22 + 0.5 * rand(b, f)) * finish}"/>`);
      }
    }
  }

  // ---- roof + parapet at the very end ---------------------------------
  if (finish > 0) {
    parts.push(`<g opacity="${finish}">
      <rect x="${BX - 6}" y="${TOP - 12}" width="${BW + 12}" height="12" fill="${C.concreteLight}"/>
      <rect x="${BX + 40}" y="${TOP - 34}" width="64" height="22" fill="${C.slab}"/>
      <rect x="${BX + BW - 120}" y="${TOP - 28}" width="48" height="16" fill="${C.slab}"/>
      <circle cx="${BX + BW / 2}" cy="${TOP - 40}" r="3.5" fill="${C.amber}"/>
      <line x1="${BX + BW / 2}" y1="${TOP - 36}" x2="${BX + BW / 2}" y2="${TOP - 12}" stroke="${C.steelDim}" stroke-width="2"/>
    </g>`);
  }

  // ---- tower crane -----------------------------------------------------
  if (craneOpacity > 0) {
    const mastX = BX - 120;
    const builtH = Math.max(frame, slabs) * FLOORS * FH;
    const craneTop = GROUND - Math.max(builtH + 150, 320);
    const jibLen = 460;
    const trolleyT = 0.25 + 0.55 * rand(Math.round(p * 37), 7); // trolley wanders deterministically
    const trolleyX = mastX + jibLen * trolleyT;
    const hookY = craneTop + 60 + (GROUND - craneTop - 120) * rand(Math.round(p * 23), 3) * 0.5;
    parts.push(`<g opacity="${craneOpacity}" stroke="${C.crane}" fill="none">
      <line x1="${mastX}" y1="${GROUND}" x2="${mastX}" y2="${craneTop}" stroke-width="4"/>
      <line x1="${mastX - 8}" y1="${GROUND}" x2="${mastX - 8}" y2="${craneTop + 20}" stroke-width="1.5" opacity="0.6"/>
      <line x1="${mastX + 8}" y1="${GROUND}" x2="${mastX + 8}" y2="${craneTop + 20}" stroke-width="1.5" opacity="0.6"/>
      <line x1="${mastX - 130}" y1="${craneTop}" x2="${mastX + jibLen}" y2="${craneTop}" stroke-width="3.5"/>
      <line x1="${mastX}" y1="${craneTop - 46}" x2="${mastX + jibLen}" y2="${craneTop}" stroke-width="1.5" opacity="0.7"/>
      <line x1="${mastX}" y1="${craneTop - 46}" x2="${mastX - 130}" y2="${craneTop}" stroke-width="1.5" opacity="0.7"/>
      <line x1="${mastX}" y1="${craneTop - 46}" x2="${mastX}" y2="${craneTop}" stroke-width="3"/>
      <rect x="${mastX - 130}" y="${craneTop - 4}" width="44" height="22" fill="${C.concrete}" stroke="none"/>
      <line x1="${trolleyX}" y1="${craneTop}" x2="${trolleyX}" y2="${hookY}" stroke-width="1.5"/>
      <rect x="${trolleyX - 10}" y="${hookY}" width="20" height="12" fill="${C.steelDim}" stroke="none"/>
      <circle cx="${mastX}" cy="${craneTop - 50}" r="3" fill="${C.amber}" stroke="none"/>
    </g>`);
  }

  // soft amber site lighting at ground level while under construction
  const siteWork = Math.min(clamp01(p / 0.06), 1 - facade * 0.8);
  if (siteWork > 0.05) {
    parts.push(`<ellipse cx="${BX + BW / 2}" cy="${GROUND + 6}" rx="${BW * 0.7}" ry="22" fill="${C.amber}" opacity="${0.05 * siteWork}"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("\n")}</svg>`;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const jobs: Promise<unknown>[] = [];
  for (let i = 0; i < FRAMES; i++) {
    const p = i / (FRAMES - 1);
    const svg = buildingSVG(p);
    const file = path.join(OUT_DIR, `frame_${String(i + 1).padStart(4, "0")}.webp`);
    jobs.push(sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(file));
  }
  await Promise.all(jobs);
  console.log(`Wrote ${FRAMES} frames to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
