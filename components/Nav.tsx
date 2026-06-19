"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LINKS = [
  { label: "Projects", href: "#projects" },
  { label: "What We Do", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

const SECTION_IDS = ["projects", "skills", "contact"];

interface NavProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Nav({ isDarkMode, onToggleDarkMode }: NavProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setScrollProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );

    sections.forEach((s) => observerRef.current!.observe(s));
    return () => observerRef.current?.disconnect();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-line backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Wordmark */}
        <a
          href="#"
          onClick={closeMenu}
          className="group flex items-center font-mono text-sm tracking-wider"
        >
          <span className="font-bold text-[#ff6600]">
            STRUCT
          </span>
          <span className="ml-[5px] font-semibold text-foreground transition-colors duration-300 group-hover:text-[#ff6600]">
            CORE
          </span>
        </a>

        {/* Desktop links + toggle */}
        <div className="hidden items-center gap-6 sm:flex">
          <ul className="flex items-center gap-6 text-sm text-muted">
            {LINKS.map(({ label, href }) => {
              const sectionId = href.replace("#", "");
              const isActive = activeSection === sectionId;
              return (
                <li key={label}>
                  <a
                    href={href}
                    className={`relative pb-0.5 transition-colors duration-150 hover:text-foreground ${
                      isActive ? "text-foreground" : ""
                    }`}
                  >
                    {label}
                    {isActive && (
                      <span className="absolute inset-x-0 -bottom-0.5 h-px bg-[#ff6600]" />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>

          {/* Day / Night scene toggle */}
          <button
            onClick={onToggleDarkMode}
            aria-label={isDarkMode ? "Switch to day scene" : "Switch to night scene"}
            className="relative flex items-center h-8 w-[4.5rem] rounded-full border border-line bg-black/60 overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6600] transition-shadow duration-700"
            style={{ boxShadow: isDarkMode ? "0 0 12px 2px rgba(255,102,0,0.18)" : "none" }}
          >
            {/* Sliding indicator */}
            <span
              className="absolute top-1 h-6 w-8 rounded-full bg-[#ff6600]/15 border border-[#ff6600]/40 transition-all duration-500"
              style={{
                left: isDarkMode ? "calc(100% - 2.25rem)" : "0.2rem",
                transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
              }}
            />
            {/* Sun icon — day mode */}
            <span
              className="relative z-10 flex items-center justify-center w-9 h-8 transition-opacity duration-300"
              style={{ opacity: isDarkMode ? 0.3 : 1 }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" fill="#ff6600" />
                {/* rays */}
                {[0,45,90,135,180,225,270,315].map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  const x1 = 8 + Math.cos(rad) * 4.2;
                  const y1 = 8 + Math.sin(rad) * 4.2;
                  const x2 = 8 + Math.cos(rad) * 5.6;
                  const y2 = 8 + Math.sin(rad) * 5.6;
                  return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ff6600" strokeWidth="1.4" strokeLinecap="round" />;
                })}
              </svg>
            </span>
            {/* Moon icon — night mode */}
            <span
              className="relative z-10 flex items-center justify-center w-9 h-8 transition-opacity duration-300"
              style={{ opacity: isDarkMode ? 1 : 0.3 }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M13 10.5A5.5 5.5 0 0 1 5.5 3a5.5 5.5 0 1 0 7.5 7.5z"
                  fill="#e0e8f8"
                />
                <circle cx="11" cy="4.5" r="0.7" fill="#c8d8f0" opacity="0.8" />
                <circle cx="13" cy="7" r="0.45" fill="#c8d8f0" opacity="0.6" />
              </svg>
            </span>
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex items-center justify-center sm:hidden text-muted hover:text-foreground transition-colors duration-150"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-line bg-black/95 backdrop-blur-md sm:hidden"
          >
            <ul className="flex flex-col px-6 py-4 gap-4 font-mono text-sm text-muted">
              {LINKS.map(({ label, href }, i) => {
                const sectionId = href.replace("#", "");
                const isActive = activeSection === sectionId;
                return (
                  <motion.li
                    key={label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.25, ease: "easeOut" }}
                  >
                    <a
                      href={href}
                      onClick={closeMenu}
                      className={`flex items-center gap-2 transition-colors duration-150 hover:text-foreground ${
                        isActive ? "text-foreground" : ""
                      }`}
                    >
                      {isActive && <span className="w-1 h-1 rounded-full bg-[#ff6600] inline-block" />}
                      {label}
                    </a>
                  </motion.li>
                );
              })}
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: LINKS.length * 0.06, duration: 0.25, ease: "easeOut" }}
              >
                <button
                  onClick={() => { onToggleDarkMode(); closeMenu(); }}
                  className="flex items-center gap-2 transition-colors duration-150 hover:text-foreground"
                >
                  <span className="w-1 h-1 rounded-full bg-[#ff6600] inline-block" />
                  {isDarkMode ? "Day Scene" : "Night Scene"}
                </button>
              </motion.li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-px bg-[#ff6600] opacity-60"
        style={{ width: `${scrollProgress}%` }}
        transition={{ duration: 0.05 }}
      />
    </header>
  );
}
