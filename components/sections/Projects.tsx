"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Reveal from "@/components/Reveal";
import { PROJECTS, type Project } from "@/lib/projects-data";

/* ─── icons ──────────────────────────────────────────────────────────── */
function DownloadIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1v8m0 0L4 6m3 3 3-3M1 11h12" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── card ───────────────────────────────────────────────────────────── */
function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <Reveal delay={index * 60}>
      <motion.article
        className="
          group relative flex flex-col overflow-hidden rounded-2xl
          border border-line bg-black/40 backdrop-blur-md
        "
        whileHover={{ y: -6, boxShadow: "0 16px 48px rgba(255,102,0,0.14)", borderColor: "rgba(255,102,0,0.4)" }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        {/* ── image + hover reveal ──────────────────────────────── */}
        <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>

          {/* cover photo */}
          <Image
            src={project.coverImage}
            alt={project.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="
              object-cover
              transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
              group-hover:scale-[1.07]
            "
          />

          {/* permanent bottom gradient so name is always readable */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

          {/* badges */}
          <span className="absolute top-3 left-3 z-10 font-mono text-[9px] uppercase tracking-widest text-foreground/80 bg-black/65 px-2.5 py-0.5 rounded-full border border-white/10 backdrop-blur-sm">
            {project.type}
          </span>
          <span className="absolute top-3 right-3 z-10 font-mono text-[10px] text-muted/80 bg-black/65 px-2.5 py-0.5 rounded-full border border-white/10 backdrop-blur-sm">
            {project.pageCount}{project.pageCount === 1 ? " sheet" : " sheets"}
          </span>

          {/* ── reveal panel: slides up from bottom ────────────── */}
          <div className="
            absolute inset-x-0 bottom-0 z-20
            translate-y-full group-hover:translate-y-0
            transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
            flex flex-col justify-end gap-3 p-5
            bg-black/95
            border-t-2 border-accent
          ">
            {/* orange scan line — fades in slightly after the panel arrives */}
            <span className="absolute inset-x-0 top-0 h-px bg-accent/40 opacity-0 group-hover:opacity-100 transition-opacity delay-300 duration-300" />

            <p className="text-[11px] leading-relaxed text-foreground/75 line-clamp-3">
              {project.description}
            </p>

            <ul className="space-y-1.5">
              {project.services.slice(0, 3).map((s) => (
                <li key={s} className="flex gap-2 text-[10px] leading-snug text-muted/80">
                  <span className="text-accent shrink-0 mt-px">▸</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── card footer — always visible ─────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line/60">
          <h3 className="truncate text-[12px] font-semibold tracking-tight leading-tight text-foreground/90">
            {project.name}
          </h3>
          <a
            href={project.samplePdf}
            download
            className="
              shrink-0 inline-flex items-center gap-1.5
              rounded-lg border border-line px-2.5 py-1.5
              font-mono text-[9px] uppercase tracking-wider text-muted
              transition-colors duration-150
              hover:border-accent hover:text-accent
            "
          >
            <DownloadIcon />
            PDF
          </a>
        </div>
      </motion.article>
    </Reveal>
  );
}

/* ─── section ────────────────────────────────────────────────────────── */
const featured = PROJECTS.filter((p) => p.featured);

export default function Projects() {
  return (
    <section id="projects" className="pt-96 pb-40">

      {/* heading */}
      <Reveal>
        <div className="flex items-baseline justify-between border-b border-line pb-6">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Projects</h2>
          <span className="font-mono text-xs text-muted">{PROJECTS.length} total</span>
        </div>
      </Reveal>

      {/* grid */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((project, i) => (
          <ProjectCard key={project.slug} project={project} index={i} />
        ))}
      </div>

      {/* view all */}
      <Reveal delay={160}>
        <div className="mt-10 flex justify-center">
          <Link
            href="/projects"
            className="group inline-flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-6 py-3 font-mono text-sm text-accent transition-all duration-200 hover:bg-accent hover:text-black hover:border-accent"
          >
            View all {PROJECTS.length} projects
            <span className="transition-transform duration-200 group-hover:translate-x-1">
              <ArrowIcon />
            </span>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
