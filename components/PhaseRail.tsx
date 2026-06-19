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

// Staff geometry — 2 bands per phase = 12 bands total
const BAND_H  = 34;   // px per alternating band
const STAFF_W = 30;   // px wide
const NUM_BANDS = PHASES.length * 2; // 12
const TOTAL_H  = NUM_BANDS * BAND_H; // 408 px

// E-pattern: marks at 0%, 33%, 50%, 67% of each band.
// Full-width at 0% and 50%; ~55% width at 33% and 67%.
const E_MARKS: { frac: number; full: boolean }[] = [
  { frac: 0,       full: true  },
  { frac: 1 / 3,   full: false },
  { frac: 1 / 2,   full: true  },
  { frac: 2 / 3,   full: false },
];

function StaffBand({ index }: { index: number }) {
  const isRed     = index % 2 === 0;
  const bg        = isRed ? "#ff6600" : "#f0f0f0";
  const markColor = isRed ? "#f0f0f0" : "#ff6600";

  // Print a number inside each red band (every 1 m of staff height)
  const mVal    = (NUM_BANDS - index) * 0.5;      // 6.0 … 0.5
  const showNum = isRed && Number.isInteger(mVal); // whole metres only

  return (
    <div
      style={{
        position: "relative",
        width: STAFF_W,
        height: BAND_H,
        backgroundColor: bg,
        flexShrink: 0,
      }}
    >
      {/* E-pattern horizontal bars */}
      {E_MARKS.map(({ frac, full }, j) => (
        <div
          key={j}
          style={{
            position: "absolute",
            top: Math.round(frac * BAND_H) - 1,
            left: 0,
            width: full ? STAFF_W : Math.round(STAFF_W * 0.52),
            height: 2,
            backgroundColor: markColor,
          }}
        />
      ))}

      {/* Metre number — right side of band, contrasting colour */}
      {showNum && (
        <div
          style={{
            position: "absolute",
            right: 4,
            top: "50%",
            transform: "translateY(-50%)",
            fontFamily: "monospace",
            fontWeight: 800,
            fontSize: 9,
            lineHeight: 1,
            color: markColor,
            userSelect: "none",
          }}
        >
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
  // Indicator climbs from bottom to top as building rises
  const indicatorTop = TOTAL_H * (1 - progress);
  const labelTop     = Math.max(0, Math.min(TOTAL_H - 32, indicatorTop - 14));
  const readingM     = (progress * (NUM_BANDS * 0.5)).toFixed(2);

  return (
    <div className="fixed right-6 top-1/2 z-20 hidden -translate-y-1/2 select-none lg:block">
      <div style={{ display: "flex", alignItems: "flex-start" }}>

        {/* Phase label — floats at crosshair level */}
        <div style={{ position: "relative", width: 92, height: TOTAL_H }}>
          <motion.div
            style={{ position: "absolute", right: 10, textAlign: "right" }}
            animate={{ top: labelTop }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
          >
            <div style={{
              fontFamily: "monospace",
              fontSize: 10,
              fontWeight: 600,
              color: "#f97316",
              whiteSpace: "nowrap",
              lineHeight: 1.4,
            }}>
              {PHASES[activePhase]}
            </div>
            <div style={{
              fontFamily: "monospace",
              fontSize: 8,
              color: "#8a7a6a",
              lineHeight: 1,
            }}>
              {readingM} m
            </div>
          </motion.div>
        </div>

        {/* ── Staff body ── */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: STAFF_W,
              border: "2px solid #333",
              borderRadius: 2,
              overflow: "hidden",
              boxShadow:
                "2px 3px 14px rgba(0,0,0,0.6), inset -2px 0 4px rgba(0,0,0,0.18)",
            }}
          >
            {Array.from({ length: NUM_BANDS }).map((_, i) => (
              <StaffBand key={i} index={i} />
            ))}
          </div>

          {/* ── Telescope crosshair ── */}
          <motion.div
            style={{
              position: "absolute",
              left: -11,
              right: -11,
              pointerEvents: "none",
              zIndex: 10,
            }}
            animate={{ top: indicatorTop }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
          >
            {/* Upper stadia hair */}
            <div style={{
              position: "absolute",
              left: 11, right: 11,
              top: -8,
              height: 1,
              backgroundColor: "rgba(255,224,0,0.5)",
            }} />

            {/* Main crosshair line */}
            <div style={{
              position: "absolute",
              left: 0, right: 0,
              top: -1,
              height: 2,
              backgroundColor: "#ffe000",
              boxShadow: "0 0 7px 2px rgba(255,224,0,0.45)",
            }} />

            {/* Lower stadia hair */}
            <div style={{
              position: "absolute",
              left: 11, right: 11,
              top: 7,
              height: 1,
              backgroundColor: "rgba(255,224,0,0.5)",
            }} />
          </motion.div>
        </div>

        {/* ── Graduation ticks on right ── */}
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
                  backgroundColor: isMajor ? "#777" : "#444",
                }} />
                {isMajor && (
                  <div style={{
                    fontFamily: "monospace",
                    fontSize: 8,
                    color: "#666",
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
