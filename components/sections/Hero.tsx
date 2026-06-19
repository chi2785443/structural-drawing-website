import Reveal from "@/components/Reveal";

export default function Hero() {
  return (
    <section className="flex min-h-[100dvh] items-center">
      <div className="w-full max-w-2xl">
        <Reveal>
          <p className="mb-4 font-mono text-sm text-muted tracking-widest uppercase">
            Aguwa Chinedu — Civil &amp; Structural Engineer
          </p>
        </Reveal>
        <Reveal delay={60}>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tighter md:text-6xl">
            Structures that stand,<br />from soil to skyline.
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            We design reinforced concrete and steel structures, conduct
            experimental concrete research, and assess the structural integrity
            of existing buildings.
          </p>
        </Reveal>
        <Reveal delay={280}>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#projects"
              className="rounded-xl bg-accent px-6 py-3 font-medium text-black transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              View projects
            </a>
            <a
              href="#contact"
              className="text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline text-sm"
            >
              Get in touch
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
