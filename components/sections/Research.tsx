import Reveal from "@/components/Reveal";

const featured = {
  title: "Seismic retrofit of reinforced-concrete frames",
  body: "Assessment and strengthening strategies for mid-rise RC buildings, combining pushover analysis with practical jacketing and bracing schemes that can actually be built.",
  tags: ["Pushover analysis", "RC frames", "Retrofit design"],
};

const others = [
  {
    title: "Fatigue in welded steel connections",
    body: "How cyclic loading erodes capacity at the weld toe, and what detailing buys back fatigue life.",
    tags: ["Steel", "Cyclic loading"],
  },
  {
    title: "Machine learning for structural health monitoring",
    body: "Using sensor data and learned models to flag stiffness loss in service, before inspection finds it.",
    tags: ["SHM", "Python"],
  },
];

export default function Research() {
  return (
    <section id="research" className="py-40">
      <Reveal>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Research
        </h2>
      </Reveal>
      <div className="mt-10 grid max-w-4xl gap-5 lg:grid-cols-[2fr_1fr]">
        <Reveal>
          <article className="flex h-full flex-col rounded-xl border border-line bg-[#0d1a2e]/80 p-8 backdrop-blur-sm">
            <h3 className="text-2xl font-medium tracking-tight">
              {featured.title}
            </h3>
            <p className="mt-4 leading-relaxed text-muted">{featured.body}</p>
            <ul className="mt-auto flex flex-wrap gap-2 pt-6 font-mono text-xs text-faint">
              {featured.tags.map((t) => (
                <li key={t} className="rounded-xl border border-line px-3 py-1">
                  {t}
                </li>
              ))}
            </ul>
          </article>
        </Reveal>
        <div className="flex flex-col gap-5">
          {others.map((item, i) => (
            <Reveal key={item.title} delay={i * 100}>
              <article className="rounded-xl border border-line bg-[#0d1a2e]/80 p-6 backdrop-blur-sm">
                <h3 className="text-lg font-medium tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {item.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
