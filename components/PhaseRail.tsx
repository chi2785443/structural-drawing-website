"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PHASES = [
  "Site prep",
  "Foundation",
  "Frame",
  "Slabs & walls",
  "Facade",
  "Topped out",
];

const BAND_H    = 36;
const STAFF_W   = 32;
const NUM_BANDS = PHASES.length * 2; // 12
const TOTAL_H   = NUM_BANDS * BAND_H; // 432 px

// E-pattern: full-width at 0 % and 50 %; ~55 % at 33 % and 67 %
const E_MARKS: { frac: number; full: boolean }[] = [
  { frac: 0,     full: true  },
  { frac: 1 / 3, full: false },
  { frac: 1 / 2, full: true  },
  { frac: 2 / 3, full: false },
];

// Site palette
const ORANGE      = "#ff6600";
const ORANGE_DIM  = "rgba(255,102,0,0.55)";
const ORANGE_FAINT = "rgba(255,102,0,0.18)";

// Band colours — dark obsidian base, subtle warm-orange tint on alternating bands
const BAND_DARK   = "rgba(10,6,2,0.82)";   // near-black with warm undertone
const BAND_TINT   = "rgba(255,90,0,0.12)"; // barely-there orange wash

// E-mark colours — crisp orange on dark, slightly darker orange on tint
const MARK_ON_DARK = "rgba(255,102,0,0.88)";
const MARK_ON_TINT = "rgba(255,102,0,0.5)";

function StaffBand({ index }: { index: number }) {
  const isDark    = index % 2 === 0;
  const bg        = isDark ? BAND_DARK : BAND_TINT;
  const markColor = isDark ? MARK_ON_DARK : MARK_ON_TINT;

  const mVal    = (NUM_BANDS - index) * 0.5;
  const showNum = isDark && Number.isInteger(mVal);

  return (
    <div style={{ position: "relative", width: STAFF_W, height: BAND_H, backgroundColor: bg, flexShrink: 0 }}>
      {E_MARKS.map(({ frac, full }, j) => (
        <div
          key={j}
          style={{
            position: "absolute",
            top: Math.round(frac * BAND_H) - 1,
            left: 0,
            width: full ? STAFF_W : Math.round(STAFF_W * 0.52),
            height: full ? 2 : 1,
            backgroundColor: markColor,
          }}
        />
      ))}

      {showNum && (
        <div style={{
          position: "absolute",
          right: 3,
          top: "50%",
          transform: "translateY(-50%)",
          fontFamily: "monospace",
          fontWeight: 700,
          fontSize: 11,
          lineHeight: 1,
          color: ORANGE_DIM,
          userSelect: "none",
        }}>
          {mVal.toFixed(0)}
        </div>
      )}
    </div>
  );
}

export default function PhaseRail() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) { setTimeout(() => setProgress(1), 0); return; }

    const trigger = ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => setProgress(self.progress),
    });
    return () => trigger.kill();
  }, []);

  const activePhase  = Math.min(PHASES.length - 1, Math.floor(progress * PHASES.length));
  const indicatorTop = TOTAL_H * (1 - progress);
  const labelTop     = Math.max(0, Math.min(TOTAL_H - 32, indicatorTop - 14));
  const readingM     = (progress * NUM_BANDS * 0.5).toFixed(2);

  return (
    <div className="fixed right-10 top-1/2 z-20 hidden -translate-y-1/2 select-none lg:block">
      <div style={{ display: "flex", alignItems: "flex-start" }}>

        {/* Floating phase label */}
        <div style={{ position: "relative", width: 100, height: TOTAL_H }}>
          <motion.div
            style={{ position: "absolute", right: 10, textAlign: "right" }}
            animate={{ top: labelTop }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
          >
            <div style={{
              fontFamily: "monospace",
              fontSize: 12,
              fontWeight: 600,
              color: ORANGE,
              whiteSpace: "nowrap",
              lineHeight: 1.4,
              textShadow: "0 0 12px rgba(255,102,0,0.5)",
            }}>
              {PHASES[activePhase]}
            </div>
            <div style={{
              fontFamily: "monospace",
              fontSize: 10,
              color: ORANGE_DIM,
              lineHeight: 1,
            }}>
              {readingM} m
            </div>
          </motion.div>
        </div>

        {/* Staff body */}
        <div style={{ position: "relative" }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            width: STAFF_W,
            border: `1px solid ${ORANGE_FAINT}`,
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: `0 0 0 1px rgba(255,102,0,0.08), 0 4px 24px rgba(0,0,0,0.5)`,
            backdropFilter: "blur(6px)",
          }}>
            {Array.from({ length: NUM_BANDS }).map((_, i) => (
              <StaffBand key={i} index={i} />
            ))}
          </div>

          {/* Crosshair — in site orange, not yellow */}
          <motion.div
            style={{ position: "absolute", left: -10, right: -10, pointerEvents: "none", zIndex: 10 }}
            animate={{ top: indicatorTop }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
          >
            {/* Stadia above */}
            <div style={{
              position: "absolute", left: 10, right: 10, top: -7, height: 1,
              backgroundColor: ORANGE_FAINT,
            }} />
            {/* Main hair */}
            <div style={{
              position: "absolute", left: 0, right: 0, top: -1, height: 2,
              backgroundColor: ORANGE,
              boxShadow: `0 0 8px 2px rgba(255,102,0,0.4)`,
            }} />
            {/* Stadia below */}
            <div style={{
              position: "absolute", left: 10, right: 10, top: 6, height: 1,
              backgroundColor: ORANGE_FAINT,
            }} />
          </motion.div>
        </div>

        {/* Graduation ticks */}
        <div style={{ position: "relative", marginLeft: 4, height: TOTAL_H }}>
          {Array.from({ length: NUM_BANDS + 1 }).map((_, i) => {
            const isMajor = (NUM_BANDS - i) % 2 === 0;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: i * BAND_H - 1,
                  left: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <div style={{
                  width: isMajor ? 8 : 4,
                  height: isMajor ? 2 : 1,
                  backgroundColor: isMajor ? ORANGE_DIM : ORANGE_FAINT,
                }} />
                {isMajor && (
                  <div style={{
                    fontFamily: "monospace",
                    fontSize: 10,
                    color: ORANGE_DIM,
                    lineHeight: 1,
                  }}>
                    {((NUM_BANDS - i) * 0.5).toFixed(1)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
