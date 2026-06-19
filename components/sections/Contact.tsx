import Reveal from "@/components/Reveal";

export default function Contact() {
  return (
    <section
      id="contact"
      className="flex min-h-[90dvh] flex-col justify-center py-40"
    >
      <div className="max-w-xl">
        <Reveal>
          <h2 className="text-4xl font-semibold leading-tight tracking-tighter md:text-5xl">
            Every structure starts with a conversation.
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-6 leading-relaxed text-muted">
            Whether it&apos;s a research idea, a design problem, or a project
            that needs a structural eye — I&apos;m always up for a meaningful
            conversation. Reach out and let&apos;s talk.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <a
              href="mailto:chineduaguwa0@gmail.com"
              className="rounded-xl bg-accent px-6 py-3 font-medium text-black transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Email me
            </a>
            <a
              href="https://linkedin.com/in/chinedu-aguwa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              LinkedIn ↗
            </a>
            <a
              href="https://github.com/chi2785443"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              GitHub ↗
            </a>
          </div>
        </Reveal>

        <Reveal delay={320}>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-2 text-xs text-muted font-mono border-t border-line pt-6">
            <span>+234 810 547 1046</span>
          </div>
        </Reveal>
      </div>

    </section>
  );
}
