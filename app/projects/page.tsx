import type { Metadata } from "next";
import ProjectsPageClient from "./ProjectsPageClient";

export const metadata: Metadata = {
  title: "Structural Drawings | Chinedu — Structural Engineer",
  description:
    "Structural engineering drawing packages for residential, commercial, ecclesiastical, and civil infrastructure projects across Nigeria.",
};

export default function ProjectsPage() {
  return <ProjectsPageClient />;
}
