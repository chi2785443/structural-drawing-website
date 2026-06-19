import Reveal from "@/components/Reveal";

export default function About() {
  return (
    <section id="about" className="py-40">
      <div className="max-w-2xl">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            About
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <p className="mt-6 leading-relaxed text-muted">
            I&apos;m a civil and structural engineer with a First Class B.Eng. from the
            Federal University of Technology, Minna (CGPA 4.79/5.0, top 2 of
            department). My work sits at the intersection of structural design,
            sustainable construction, and computational tools — from reinforced
            concrete analysis on live sites to training machine-learning models
            that predict concrete mix ratios.
          </p>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-4 leading-relaxed text-muted">
            My research focuses on concrete materials and experimental mix
            design, embodied carbon and lifecycle assessment, and AI-assisted
            optimisation of construction materials. I published a peer-reviewed
            methodology for automating the British DoE concrete mix design
            procedure using Python, and I&apos;m currently developing{" "}
            <span className="text-foreground font-medium">BuildCore</span> — a
            construction management tool that integrates Bills of Quantities
            with embodied carbon accounting and ML-driven material substitution.
          </p>
        </Reveal>

        <Reveal delay={220}>
          <p className="mt-4 leading-relaxed text-muted">
            Alongside research, I work as a Graduate Structural Engineer at
            Urban Shelter Limited (Abuja) and as a part-time Software
            Engineering Intern at EDAT Climate Data and Analytics (Houston,
            remote), where I built carbon accounting modules covering Scope 1,
            2, and 3 emissions aligned with EPA WARM v16, DEFRA, and IPCC
            methodologies.
          </p>
        </Reveal>

        <Reveal delay={300}>
          <ul className="mt-8 space-y-2 border-t border-line pt-6 text-sm text-muted">
            <li>
              <span className="text-accent/70 mr-2">—</span>
              B.Eng. Civil Engineering · FUT Minna · First Class · 4.79/5.0
            </li>
            <li>
              <span className="text-accent/70 mr-2">—</span>
              Published: Nile Journal of Engineering and Applied Science, 2025
            </li>
            <li>
              <span className="text-accent/70 mr-2">—</span>
              Top 100 Africa Future Leaders — Class of 2025
            </li>
            <li>
              <span className="text-accent/70 mr-2">—</span>
              PTDF In-Country Scholar · 2021 – 2024
            </li>
            <li>
              <span className="text-accent/70 mr-2">—</span>
              Based in Abuja, Nigeria · Open to collaboration
            </li>
          </ul>
        </Reveal>

        <Reveal delay={380}>
          <div className="mt-8 flex flex-wrap gap-2">
            {[
              "Concrete Mix Design",
              "Lifecycle Assessment",
              "Embodied Carbon",
              "Machine Learning",
              "Structural Analysis",
              "Python",
              "TensorFlow",
              "Autodesk Revit",
              "BIM",
              "Scope 1–3 Emissions",
            ].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-line px-3 py-1 text-xs text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
