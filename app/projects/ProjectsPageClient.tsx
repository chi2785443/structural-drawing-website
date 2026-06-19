"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Reveal from "@/components/Reveal";
import { PROJECTS } from "@/lib/projects-data";

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M7 1v8m0 0L4 6m3 3 3-3M1 11h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProjectsPageClient() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-night", String(isDarkMode));
  }, [isDarkMode]);

  return (
    <>
      <Nav isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode((v) => !v)} />

      <main className="mx-auto max-w-7xl px-6 pt-28 pb-24">

        {/* Back */}
        <Reveal>
          <Link
            href="/#projects"
            className="inline-flex items-center gap-2 font-mono text-xs text-muted hover:text-accent transition-colors duration-150 mb-10"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M12 7H2M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to portfolio
          </Link>
        </Reveal>

        {/* Heading */}
        <Reveal>
          <p className="font-mono text-xs text-accent tracking-widest uppercase mb-3">Project Archive</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">All Projects</h1>
          <p className="mt-4 max-w-xl text-sm text-muted leading-relaxed">
            Structural engineering packages for residential, commercial, ecclesiastical, and
            civil projects across Nigeria. Client names and plot references have been removed
            from all sample downloads.
          </p>
        </Reveal>

        <div className="mt-10 border-t border-line" />

        {/* Stats */}
        <Reveal delay={60}>
          <div className="mt-6 mb-10 flex flex-wrap gap-x-8 gap-y-2 font-mono text-xs text-muted">
            <span>{PROJECTS.length} projects</span>
            <span>{PROJECTS.reduce((s, p) => s + p.pageCount, 0)} total sheets</span>
            <span>Samples anonymised · 3 pages max</span>
          </div>
        </Reveal>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((project, i) => (
            <Reveal key={project.slug} delay={(i % 3) * 45}>
              <article className="group flex flex-col rounded-2xl border border-line bg-zinc-950 overflow-hidden transition-all duration-300 hover:border-accent/40 hover:shadow-[0_0_24px_rgba(255,102,0,0.07)]">

                {/* Cover */}
                <div className="relative overflow-hidden bg-zinc-900" style={{ aspectRatio: "4/3" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={project.coverImage}
                    alt={project.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                  <span className="absolute top-2.5 left-2.5 font-mono text-[9px] uppercase tracking-widest text-muted/90 bg-black/70 px-2 py-0.5 rounded-full border border-white/10">
                    {project.type}
                  </span>
                  {project.featured && (
                    <span className="absolute bottom-2.5 left-2.5 font-mono text-[9px] uppercase tracking-widest text-accent bg-black/80 border border-accent/30 px-2 py-0.5 rounded-full">
                      Featured
                    </span>
                  )}
                  <span className="absolute top-2.5 right-2.5 font-mono text-[10px] text-muted/80 bg-black/70 px-2 py-0.5 rounded-full border border-white/10">
                    {project.pageCount} {project.pageCount === 1 ? "sheet" : "sheets"}
                  </span>
                </div>

                {/* Body */}
                <div className="flex flex-col gap-3 p-5">
                  <h2 className="text-[13px] font-semibold leading-snug tracking-tight">
                    {project.name}
                  </h2>

                  <p className="text-[11px] leading-relaxed text-muted">
                    {project.description}
                  </p>

                  {/* Services */}
                  <ul className="space-y-1.5 pt-1 border-t border-line">
                    {project.services.map((s) => (
                      <li key={s} className="flex gap-2 text-[11px] text-muted/70 pt-1 first:pt-1.5">
                        <span className="text-accent shrink-0 mt-[1px]">▸</span>
                        {s}
                      </li>
                    ))}
                  </ul>

                  {/* Download */}
                  <div className="flex items-center gap-3 pt-1">
                    <a
                      href={project.samplePdf}
                      download
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 font-mono text-[10px] text-muted transition-colors duration-150 hover:border-accent hover:text-accent"
                    >
                      <DownloadIcon />
                      Sample PDF
                    </a>
                    <span className="text-[10px] font-mono text-faint">
                      {Math.min(3, project.pageCount)} of {project.pageCount} pages
                    </span>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-16 border-t border-line pt-8 text-center">
          <p className="font-mono text-[11px] text-muted">
            All samples are anonymised. Full drawing sets and references available on request.
          </p>
        </div>
      </main>
    </>
  );
}
