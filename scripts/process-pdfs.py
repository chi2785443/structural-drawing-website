#!/usr/bin/env python3
"""
Process structural engineering PDFs:
  - Extract a cover JPG from a representative plan page
  - Build a redacted 2-3 page sample PDF (title block blanked out)

Requirements:
  brew install poppler
  pip3 install pypdf pymupdf --break-system-packages
"""

import subprocess
import shutil
import os
import sys
from pathlib import Path
import fitz  # pymupdf

PDF_DIR  = Path(__file__).parent.parent / "my projrct"
PUB_DIR  = Path(__file__).parent.parent / "public"
IMG_OUT  = PUB_DIR / "projects"
PDF_OUT  = PUB_DIR / "pdfs"

PROJECTS = [
    ("ARCWELL STRUCTURAL DRAWING final.pdf",            "commercial-building-lagos"),
    ("BENJAMIN EDOJE.pdf",                              "residential-building-southwest-a"),
    ("DR BENJAMIN NNADOZIE.pdf",                        "residential-building-southeast-a"),
    ("M.K MUHAMMAD WUDIL-STRUCTURAL DRAWING.pdf",       "residential-building-kano"),
    ("MR & MRS ALUKO - MOPO.pdf",                       "residential-building-ijebu"),
    ("MR KENNETH.pdf",                                  "residential-building-southwest-b"),
    ("MR. SEGUN IREMIPO ADEBAYO & MRS. OLUSEYI TOLULOPE ADEBAYO.pdf", "residential-building-southwest-c"),
    ("NWEKE SAMUEL ELOCHUKWU.pdf",                      "residential-building-southeast-b"),
    ("PROPOSED CHURCH AUDITORIUM STRUCTURAL.pdf",       "church-auditorium-eastern-nigeria"),
    ("UGOADA UKAMAKA IKE.pdf",                          "residential-building-southeast-c"),
    ("benjamin adebayo structural drawing.pdf",         "residential-building-southwest-d"),
    ("drainage detail.pdf",                             "drainage-infrastructure-urban"),
]

# Title block spans the full width of the bottom strip
REDACT_X = 0.0
REDACT_Y = 0.82

# Terms that may bleed above the geometric strip — redact wherever found
REDACT_TERMS = [
    "GEO-ARIES", "CONSULT", "CONSULTANT",
    "CLIENT", "08142191556", "09055013191",
    "Palmsbay", "Abijo", "Lagos State",
    "BENJAMIN ADEBAYO", "BENJAMIN EDOJE", "BENJAMIN NNADOZIE",
    "KENNETH", "SEGUN IREMIPO", "OLUSEYI TOLULOPE",
    "NWEKE SAMUEL", "UGOADA UKAMAKA", "ALUKO",
    "M.K MUHAMMAD", "ARCWELL",
]


def pick_cover_page(n: int) -> int:
    if n == 1:  return 0
    if n <= 13: return 2   # page 3
    if n <= 24: return 3   # page 4
    return 4               # page 5 for large sets


def pick_sample_pages(n: int) -> list:
    if n == 1:  return [0]
    candidates = [2, 3, 4]
    return [i for i in candidates if i < n]


def render_cover(pdf_path: Path, page_0idx: int, out_dir: Path) -> Path | None:
    out_dir.mkdir(parents=True, exist_ok=True)
    prefix = str(out_dir / "cover_raw")
    page_1idx = page_0idx + 1
    cmd = ["pdftoppm", "-jpeg", "-r", "150",
           "-f", str(page_1idx), "-l", str(page_1idx),
           str(pdf_path), prefix]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"    [ERROR] pdftoppm: {r.stderr.strip()}")
        return None
    matches = sorted(list(out_dir.glob("cover_raw-*.jpg")) +
                     list(out_dir.glob("cover_raw-*.jpeg")) +
                     list(out_dir.glob("cover_raw-1.jpg")))
    if not matches:
        print(f"    [ERROR] no jpg output in {out_dir}")
        return None
    dest = out_dir / "cover.jpg"
    matches[0].rename(dest)
    return dest


def build_sample(pdf_path: Path, pages: list, out_path: Path) -> None:
    src = fitz.open(str(pdf_path))
    out = fitz.open()
    for idx in pages:
        if idx >= len(src):
            continue
        out.insert_pdf(src, from_page=idx, to_page=idx)
        pg = out[-1]
        w, h = pg.rect.width, pg.rect.height
        # Full-width bottom strip covers entire title block
        pg.add_redact_annot(fitz.Rect(REDACT_X, h * REDACT_Y, w, h), fill=(1, 1, 1))
        # Keyword pass — catches identifying text that bleeds above the strip
        for term in REDACT_TERMS:
            for r in pg.search_for(term):
                pg.add_redact_annot(r, fill=(1, 1, 1))
        pg.apply_redactions()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out.save(str(out_path))
    src.close()
    out.close()


def main():
    if not shutil.which("pdftoppm"):
        print("ERROR: pdftoppm not found. Run: brew install poppler")
        sys.exit(1)

    print(f"\nProcessing {len(PROJECTS)} PDFs...\n")

    for filename, slug in PROJECTS:
        pdf_path = PDF_DIR / filename
        if not pdf_path.exists():
            print(f"[SKIP] not found: {filename}")
            continue

        src = fitz.open(str(pdf_path))
        total = len(src)
        src.close()

        cover_page  = pick_cover_page(total)
        sample_pages = pick_sample_pages(total)

        print(f"  {slug}")
        print(f"    pages={total}  cover=p{cover_page+1}  sample={[p+1 for p in sample_pages]}")

        cover = render_cover(pdf_path, cover_page, IMG_OUT / slug)
        if cover:
            print(f"    cover  → {cover.relative_to(PUB_DIR.parent)}")

        sample_path = PDF_OUT / f"{slug}-sample.pdf"
        build_sample(pdf_path, sample_pages, sample_path)
        print(f"    sample → {sample_path.relative_to(PUB_DIR.parent)}")
        print()

    print("Done.")
    print(f"  Cover images : {len(list(IMG_OUT.rglob('cover.jpg')))}")
    print(f"  Sample PDFs  : {len(list(PDF_OUT.glob('*-sample.pdf')))}")


if __name__ == "__main__":
    main()
