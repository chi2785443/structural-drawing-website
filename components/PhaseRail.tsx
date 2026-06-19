"use client";

import { useEffect, useState } from "react";
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

// Ruler minor tick widths between each major mark (alternating like a real tape measure)
const MINOR_TICKS = [5, 9, 5, 12, 5, 9, 5] as const;

export default function PhaseRail() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      setActive(PHASES.length - 1);
      return;
    }
    const trigger = ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const next = Math.min(
          PHASES.length - 1,
          Math.floor(self.progress * PHASES.length)
        );
        setActive((prev) => (prev === next ? prev : next));
      },
    });
    return () => trigger.kill();
  }, []);

  return (
    <div className="fixed right-6 top-1/2 z-20 hidden -translate-y-1/2 select-none lg:block">
      <div className="relative flex flex-col items-end rounded-lg bg-[#07090d]/60 px-4 py-3 backdrop-blur-md ring-1 ring-[#f97316]/10">

        {/* Ruler spine — the vertical measuring tape body */}
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-px bg-gradient-to-b from-transparent via-[#f97316]/40 to-transparent" />

        {PHASES.map((phase, i) => {
          const isCurrent = i === active;
          const isPast = i < active;

          return (
            <div key={phase}>
              {/* Minor tick group between phases */}
              {i > 0 && MINOR_TICKS.map((tickW, j) => (
                <div key={j} className="flex items-center justify-end h-[7px] pr-px">
                  <div
                    style={{ width: tickW }}
                    className={`h-px transition-colors duration-500 ${
                      i <= active
                        ? "bg-[#f97316]/50"
                        : "bg-[#6a8898]/50"
                    }`}
                  />
                </div>
              ))}

              {/* Major tick row — one per phase */}
              <div className="relative flex items-center justify-end gap-[10px] pr-px" style={{ height: 32 }}>

                {/* Reading-mark notch on the spine (active only) */}
                {isCurrent && (
                  <div className="pointer-events-none absolute right-[-2px] top-1/2 z-10 h-[18px] w-[4px] -translate-y-1/2 rounded-[1px] bg-[#f97316] shadow-[0_0_12px_#f97316cc]" />
                )}

                {/* Label block */}
                <div
                  className={`flex flex-col items-end transition-all duration-500 ${
                    isCurrent
                      ? "text-[#f97316]"
                      : isPast
                      ? "text-[#8fafc0]"
                      : "text-[#6a8898]"
                  }`}
                >
                  <span className="mb-[1px] font-mono text-[9px] leading-none opacity-60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`font-mono leading-tight tracking-wide transition-all duration-500 ${
                      isCurrent
                        ? "text-[11.5px] font-semibold"
                        : "text-[10.5px] font-normal"
                    }`}
                  >
                    {phase}
                  </span>
                </div>

                {/* Major tick mark — length and brightness signals state */}
                <div
                  className={`rounded-full transition-all duration-500 ${
                    isCurrent
                      ? "h-[2px] w-9 bg-[#f97316] shadow-[0_0_6px_#f97316aa]"
                      : isPast
                      ? "h-px w-6 bg-[#8fafc0]/70"
                      : "h-px w-4 bg-[#6a8898]/60"
                  }`}
                />
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
