import Reveal from "@/components/Reveal";

const groups = [
  {
    name: "Structural Design",
    summary: "Analysis and design of RC and steel structures from concept through drawing production.",
    items: [
      "Prota-Structure",
      "Autodesk Robot",
      "Autodesk Revit (BIM)",
      "AutoCAD · Civil 3D",
      "Orion",
      "Manual RC & Steel Design",
    ],
  },
  {
    name: "Construction & Site",
    summary: "Site supervision, integrity assessments, and geotechnical investigations on live projects.",
    items: [
      "Primavera P6 · MS Project",
      "Site Supervision",
      "Structural Integrity Assessment",
      "Geotechnical Testing (DCPT)",
      "Reinforcement Detailing",
      "Material Inventory Management",
    ],
  },
  {
    name: "Research & Testing",
    summary: "Experimental concrete research, material characterisation, and technical publication.",
    items: [
      "Concrete Mix Design (DoE)",
      "Compressive Strength Testing",
      "Slump & Compaction Tests",
      "Atterberg Limits",
      "Experimental Design",
      "Technical Report Writing",
    ],
  },
  {
    name: "Sustainability",
    summary: "Embodied carbon quantification and low-carbon material selection across design phases.",
    items: [
      "Lifecycle Assessment (LCA)",
      "Embodied Carbon Quantification",
      "Bills of Quantities",
      "GHG Protocol Standards",
      "Low-Carbon Material Selection",
      "Net-Zero Construction",
    ],
  },
];

export default function Skills() {
  return (
    <section id="skills" className="py-40">
      <Reveal>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          What I Do
        </h2>
      </Reveal>
      <Reveal delay={80}>
        <p className="mt-4 max-w-lg text-muted leading-relaxed">
          Four areas where my training, research, and site experience come
          together.
        </p>
      </Reveal>

      <div className="mt-12 grid max-w-4xl gap-8 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((group, i) => (
          <Reveal key={group.name} delay={i * 80}>
            <h3 className="font-semibold text-sm text-foreground">{group.name}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{group.summary}</p>
            <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm text-muted">
              {group.items.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-accent text-[10px]">▸</span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
