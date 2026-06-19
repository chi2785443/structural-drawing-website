export interface Project {
  slug: string;
  name: string;
  type: string;
  description: string;
  services: string[];
  coverImage: string;
  samplePdf: string;
  pageCount: number;
  featured: boolean;
}

export const PROJECTS: Project[] = [
  {
    slug: "church-auditorium-eastern-nigeria",
    name: "Church Auditorium, Eastern Nigeria",
    type: "Ecclesiastical",
    description:
      "Full structural design for a large-span church auditorium accommodating several hundred worshippers. The scheme addressed long-span roof loads, lateral stability under wind, and a suspended ground floor over made-up ground. RC columns and shear walls were sized for combined gravity and lateral load combinations to Nigerian building code.",
    services: [
      "Structural analysis & load take-down",
      "Foundation design — pile caps and ground beams",
      "RC frame design — columns, beams, suspended slab",
      "Long-span roof truss sizing and connection schedule",
      "Full 42-sheet drawing production",
    ],
    coverImage: "/projects/church-auditorium-eastern-nigeria/cover.jpg",
    samplePdf: "/pdfs/church-auditorium-eastern-nigeria-sample.pdf",
    pageCount: 42,
    featured: true,
  },
  {
    slug: "residential-building-ijebu",
    name: "Residential Building, Ijebu Area",
    type: "Residential",
    description:
      "Structural design for a multi-storey detached residence on a restricted plot in the Ijebu region. Strip and pad foundations were sized from borehole and DCPT data. Suspended RC slabs span between downstand beams, with an RC staircase core providing lateral bracing. The 24-sheet package covers all substructure, superstructure, and roof levels.",
    services: [
      "Geotechnical data review and foundation selection",
      "Strip and pad foundation design",
      "RC ring beams, columns, and suspended slabs",
      "Staircase and landing structural detailing",
      "24-sheet drawing production",
    ],
    coverImage: "/projects/residential-building-ijebu/cover.jpg",
    samplePdf: "/pdfs/residential-building-ijebu-sample.pdf",
    pageCount: 24,
    featured: true,
  },
  {
    slug: "residential-building-southeast-c",
    name: "Residential Building, Southeast Nigeria",
    type: "Residential",
    description:
      "Complete structural package for a two-storey family residence in Southeast Nigeria. Pad and strip foundations transfer loads to medium-density laterite; the superstructure uses an RC frame with infill blockwork. The first-floor slab is a solid suspended RC slab spanning one-way onto downstand beams, with a pitched timber-and-steel roof over the upper storey.",
    services: [
      "Foundation layout and bearing-pressure check",
      "RC column and beam schedule",
      "Suspended slab design and detailing",
      "Roof framing plan and purlin sizing",
      "23-sheet drawing production",
    ],
    coverImage: "/projects/residential-building-southeast-c/cover.jpg",
    samplePdf: "/pdfs/residential-building-southeast-c-sample.pdf",
    pageCount: 23,
    featured: true,
  },
  {
    slug: "commercial-building-lagos",
    name: "Commercial Building, Lagos Region",
    type: "Commercial",
    description:
      "Structural design for a multi-storey commercial development in the Lagos metropolitan area. The scheme uses a reinforced concrete frame on pile cap foundations, with shear walls at the service core to resist lateral loads. Suspended flat slabs span between RC columns on a regular grid, with post-installed mechanical and electrical penetrations coordinated at design stage.",
    services: [
      "RC frame analysis — gravity and lateral load combinations",
      "Pile cap and ground beam foundation design",
      "Flat slab and downstand beam design",
      "Shear wall sizing for wind resistance",
      "18-sheet drawing production",
    ],
    coverImage: "/projects/commercial-building-lagos/cover.jpg",
    samplePdf: "/pdfs/commercial-building-lagos-sample.pdf",
    pageCount: 18,
    featured: true,
  },
  {
    slug: "residential-building-kano",
    name: "Residential Building, Kano Region",
    type: "Residential",
    description:
      "Structural drawings for a residential dwelling in Northern Nigeria where load-bearing sandcrete blockwork is the primary vertical structure. RC ring beams at each floor level tie the masonry together and distribute vertical loads; a ground-bearing RC slab sits on well-compacted laterite fill. The roof is a pitched timber rafter system with steel ridge and hip members.",
    services: [
      "Load-bearing masonry wall layout and sizing",
      "RC ring beam design at sill and lintel levels",
      "Ground-bearing slab design on compacted fill",
      "Roof rafter and ridge beam sizing",
      "11-sheet drawing production",
    ],
    coverImage: "/projects/residential-building-kano/cover.jpg",
    samplePdf: "/pdfs/residential-building-kano-sample.pdf",
    pageCount: 11,
    featured: true,
  },
  {
    slug: "residential-building-southwest-b",
    name: "Residential Building, Southwest Nigeria",
    type: "Residential",
    description:
      "Single-family detached residence in Southwest Nigeria. A ground-bearing RC slab on hardcore fill forms the ground floor; RC columns and ring beams carry the first floor and roof. Downstand beams span between columns to support a solid one-way suspended slab. Gutter and fascia details are included to manage rainwater discharge from the hipped roof.",
    services: [
      "Ground-bearing slab design",
      "RC column grid and ring beam layout",
      "First-floor beam and slab schedule",
      "Roof framing and gutter detail",
      "14-sheet drawing production",
    ],
    coverImage: "/projects/residential-building-southwest-b/cover.jpg",
    samplePdf: "/pdfs/residential-building-southwest-b-sample.pdf",
    pageCount: 14,
    featured: true,
  },
  {
    slug: "residential-building-southwest-a",
    name: "Residential Building, Southwest Nigeria",
    type: "Residential",
    description:
      "Two-storey detached residence with strip and pad foundations set into medium-bearing-capacity laterite. An RC ring beam at ground-floor level ties the columns together before the suspended first-floor slab is cast; a secondary ring beam at roof level supports the pitched roof. Staircase detailing covers waist slab, steps, and landing junction.",
    services: [
      "Strip and pad foundation design",
      "RC ring beam and column schedule",
      "Suspended slab spanning and detailing",
      "Staircase structural detailing",
      "13-sheet drawing production",
    ],
    coverImage: "/projects/residential-building-southwest-a/cover.jpg",
    samplePdf: "/pdfs/residential-building-southwest-a-sample.pdf",
    pageCount: 13,
    featured: false,
  },
  {
    slug: "residential-building-southeast-a",
    name: "Residential Building, Southeast Nigeria",
    type: "Residential",
    description:
      "Residential development in Southeast Nigeria with a mix of pad and strip foundations responding to variable subsoil conditions identified from trial pits. The ground floor is suspended on short RC columns and a ring beam, keeping the slab clear of seasonal moisture movement in the subgrade. An RC frame carries loads to roof level.",
    services: [
      "Foundation selection from trial pit data",
      "Suspended ground-floor slab detailing",
      "RC frame column and beam design",
      "Reinforcement bar schedule",
      "13-sheet drawing production",
    ],
    coverImage: "/projects/residential-building-southeast-a/cover.jpg",
    samplePdf: "/pdfs/residential-building-southeast-a-sample.pdf",
    pageCount: 13,
    featured: false,
  },
  {
    slug: "residential-building-southwest-c",
    name: "Residential Building, Southwest Nigeria",
    type: "Residential",
    description:
      "Compact two-storey residence on a constrained urban plot. The structural solution uses a ground-bearing RC slab, minimal column grid, and short-span RC beams to keep the frame economical within the tight floor plate. An RC staircase core doubles as the primary lateral stiffening element for the building.",
    services: [
      "Ground-bearing slab on compacted fill",
      "Compact RC column grid design",
      "Beam and slab schedule",
      "RC staircase as lateral stiffener",
      "10-sheet drawing production",
    ],
    coverImage: "/projects/residential-building-southwest-c/cover.jpg",
    samplePdf: "/pdfs/residential-building-southwest-c-sample.pdf",
    pageCount: 10,
    featured: false,
  },
  {
    slug: "residential-building-southeast-b",
    name: "Residential Building, Southeast Nigeria",
    type: "Residential",
    description:
      "Two-storey residential building with strip and pad foundations transferring loads to firm laterite. The superstructure is a conventional RC frame with blockwork infill; all columns, beams, and slabs are detailed to BS 8110. A full reinforcement schedule and bending schedules accompany the general arrangement drawings.",
    services: [
      "Strip and pad foundation design",
      "RC column, beam, and slab design to BS 8110",
      "Reinforcement bending schedules",
      "General arrangement drawing set",
      "13-sheet drawing production",
    ],
    coverImage: "/projects/residential-building-southeast-b/cover.jpg",
    samplePdf: "/pdfs/residential-building-southeast-b-sample.pdf",
    pageCount: 13,
    featured: false,
  },
  {
    slug: "residential-building-southwest-d",
    name: "Residential Building, Southwest Nigeria",
    type: "Residential",
    description:
      "Residential structural package covering substructure through to roof. The foundation layout responds to a sloping site, with stepped strip footings following the natural ground profile. Upper-floor framing uses RC downstand beams and a one-way solid slab; the roof is a hybrid steel-and-timber pitched system with detailed ridge and hip connections.",
    services: [
      "Stepped strip foundation on sloping site",
      "RC frame — columns, beams, and suspended slab",
      "Upper-floor framing plan",
      "Hybrid steel-timber roof structural design",
      "12-sheet drawing production",
    ],
    coverImage: "/projects/residential-building-southwest-d/cover.jpg",
    samplePdf: "/pdfs/residential-building-southwest-d-sample.pdf",
    pageCount: 12,
    featured: false,
  },
  {
    slug: "drainage-infrastructure-urban",
    name: "Drainage Infrastructure, Urban Site",
    type: "Civil",
    description:
      "Civil drainage design for an urban site with poor natural drainage and a high seasonal water table. The scheme routes stormwater through precast concrete U-channels to a roadside manhole and outfall, avoiding ponding at the building perimeter. Channel sizing was based on a 10-year return-period storm event using rational method calculations.",
    services: [
      "Stormwater catchment area calculation",
      "Rational method peak flow estimation — 10-yr storm",
      "Precast channel section selection and sizing",
      "Manhole schedule and outfall detail",
      "Single-sheet drainage layout drawing",
    ],
    coverImage: "/projects/drainage-infrastructure-urban/cover.jpg",
    samplePdf: "/pdfs/drainage-infrastructure-urban-sample.pdf",
    pageCount: 1,
    featured: false,
  },
];
