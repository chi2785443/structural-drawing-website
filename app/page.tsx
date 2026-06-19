"use client";

import { useState, useEffect } from "react";
import ConstructionCanvas from "@/components/ConstructionCanvas";
import PhaseRail from "@/components/PhaseRail";
import Nav from "@/components/Nav";
import Hero from "@/components/sections/Hero";
import Projects from "@/components/sections/Projects";
import Skills from "@/components/sections/Skills";
import Contact from "@/components/sections/Contact";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-night", String(isDarkMode));
  }, [isDarkMode]);

  return (
    <>
      <ConstructionCanvas isDarkMode={isDarkMode} />
      <PhaseRail />
      <Nav isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(v => !v)} />

      <main className="relative z-10 mx-auto max-w-7xl px-6">
        <Hero />
        <Projects />
        <Skills />
        <Contact />
      </main>
    </>
  );
}
