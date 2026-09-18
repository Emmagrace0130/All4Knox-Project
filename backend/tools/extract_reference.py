"""
Extracts the reference documents in backend/app/data/reference/manifest.json
into retrievable passages: backend/app/data/reference/passages/<id>.json.

The passages files are GENERATED. To change what the assistant retrieves, edit
the manifest (which pages are excluded, and why), a transcription file (content
the PDF text layer cannot give us), or the heading rules below — then re-run.

Usage (from the repo root; pdfplumber is deliberately not in the API image):
    ./a4k reference

which runs:
    docker run --rm --user "$(id -u):$(id -g)" -v "$PWD":/work -w /work \
      -e HOME=/tmp python:3.12-slim sh -c \
      "pip install -q --user pdfplumber && python backend/tools/extract_reference.py"

After re-running: review the diff, run the tests, and reindex. A re-extraction
that changes passage text changes what the assistant can say, so the diff is
the thing to read, not the exit code.
"""

from __future__ import annotations

import collections
import hashlib
import json
import re
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.rag.chunking import Line, Passage, Section, merge_tiny, pack, split_sections  # noqa: E402

REFERENCE_DIR = ROOT / "backend" / "app" / "data" / "reference"


# --------------------------------------------------------------------------
# Reading lines out of a PDF
# --------------------------------------------------------------------------
def read_lines(pdf_path: Path, skip_pages: set[int]) -> list[Line]:
    lines: list[Line] = []
    with pdfplumber.open(pdf_path) as pdf:
        for number, page in enumerate(pdf.pages, start=1):
            if number in skip_pages:
                continue
            for raw in page.extract_text_lines(return_chars=True, strip=True):
                chars = [c for c in raw["chars"] if c["text"].strip()]
                if not chars:
                    continue
                size = collections.Counter(round(c["size"], 1) for c in chars).most_common(1)[0][0]
                bold = sum("Bold" in c["fontname"] for c in chars) / len(chars) > 0.6
                lines.append(Line(page=number, text=raw["text"].strip(), size=size, bold=bold))
    return lines


# --------------------------------------------------------------------------
# Per-document structure rules. Each was derived by printing every bold or
# large line of the document and reading them, not guessed from the TOC.
# --------------------------------------------------------------------------
def guideline_rules():
    running = re.compile(r"^(Section [IVX]+: .+|Version 4\s*[-–]\s*2023.*|Page \d+ of 56)$")
    # Table furniture in Appendix B that carries no content of its own.
    furniture = {"Diagnostic Criteria Meets criteria? Notes", "Yes No"}
    subsection = re.compile(r"^(?:[A-H]\.\s|E\.\d+\.\s|APPENDIX\b)")

    def drop(line: Line) -> bool:
        return bool(running.match(line.text)) or line.text in furniture

    def is_h1(line: Line) -> bool:  # "Section II" / "Initiating Treatment" at 28pt
        return line.bold and line.size >= 20

    def is_h2(line: Line) -> bool:  # "D. GENERAL DOSING GUIDELINES", "APPENDIX E - ...", "E.4. ..."
        return line.bold and abs(line.size - 12.0) < 0.3 and bool(subsection.match(line.text))

    def continues(prev: Line, line: Line) -> bool:
        if prev.page != line.page or not line.bold:
            return False
        if is_h1(prev):
            return is_h1(line)
        # A wrapped subsection heading: same size, all capitals ("PREVENTION").
        return abs(line.size - prev.size) < 0.3 and line.text.isupper() and not subsection.match(line.text)

    return drop, is_h1, is_h2, continues


def program_description_rules():
    title = re.compile(r"^(Buprenorphine Enhanced and Supportive|Network Provider Requirements and Program Description|Updated March 2023$)")

    def drop(line: Line) -> bool:
        return bool(title.match(line.text)) or line.text.isdigit()

    def is_h1(line: Line) -> bool:
        return False

    def is_h2(line: Line) -> bool:
        # Whole-line bold headings. A bold line ending in ':' or ';' is a
        # lead-in ("Maintenance Phase:") that belongs with the text after it.
        return line.bold and len(line.text) < 110 and not line.text.endswith((":", ";"))

    return drop, is_h1, is_h2, None


RULES = {
    "tn-bup-guidelines-2023": guideline_rules,
    "tenncare-besmart-pd-2023": program_description_rules,
}


# --------------------------------------------------------------------------
def excluded_pages(doc: dict) -> set[int]:
    return {p for group in doc.get("excludedPages", []) for p in group["pages"]}


def load_transcriptions(doc_id: str) -> dict | None:
    path = REFERENCE_DIR / "transcriptions" / f"{doc_id}.json"
    return json.loads(path.read_text()) if path.exists() else None


def sectioned_passages(doc: dict, pdf_path: Path, skip: set[int]) -> list[Passage]:
    drop, is_h1, is_h2, continues = RULES[doc["id"]]()
    lines = [ln for ln in read_lines(pdf_path, skip) if not drop(ln)]
    passages: list[Passage] = []
    for section in split_sections(lines, is_h1, is_h2, continues):
        # Text before the first heading is the document's own introduction.
        section.path = section.path or ["Introduction"]
        passages.extend(pack(section))
    return merge_tiny(passages)


def slide_passages(pdf_path: Path, skip: set[int]) -> list[Passage]:
    """One passage per slide: the first line is the slide title."""
    passages: list[Passage] = []
    by_page: dict[int, list[Line]] = collections.defaultdict(list)
    for line in read_lines(pdf_path, skip):
        by_page[line.page].append(line)
    for page, lines in sorted(by_page.items()):
        # Slide numbers and the UHC copyright footer are not content.
        body = [ln for ln in lines if not ln.text.isdigit() and not ln.text.startswith("©")]
        if len(body) < 2:
            continue
        title, rest = body[0].text, body[1:]
        for passage in pack(Section(path=[title], lines=rest), slide=True):
            passages.append(passage)
    return passages


def extract(doc: dict) -> dict:
    pdf_path = ROOT / doc["sourceFile"]
    transcription = load_transcriptions(doc["id"])
    transcribed_pages = {
        p for t in (transcription or {}).get("passages", []) for p in t["pages"]
    }
    skip = excluded_pages(doc) | transcribed_pages

    if doc["extraction"] == "sectioned":
        extracted = sectioned_passages(doc, pdf_path, skip)
    elif doc["extraction"] == "slides":
        extracted = slide_passages(pdf_path, skip)
    else:
        raise ValueError(f"{doc['id']}: unknown extraction mode {doc['extraction']!r}")

    records = [
        {
            "id": f"{doc['id']}:p{n:03d}",
            "section": p.section,
            "pageStart": p.page_start,
            "pageEnd": p.page_end,
            "method": "extracted",
            "text": p.text,
        }
        for n, p in enumerate(extracted, start=1)
    ]
    for t in (transcription or {}).get("passages", []):
        records.append(
            {
                "id": f"{doc['id']}:t:{t['id']}",
                "section": t["section"],
                "pageStart": min(t["pages"]),
                "pageEnd": max(t["pages"]),
                "method": "transcribed",
                "transcribedBy": transcription["transcribedBy"],
                "transcribedDate": transcription["transcribedDate"],
                "checkedBy": transcription.get("checkedBy"),
                "checkedDate": transcription.get("checkedDate"),
                "text": t["text"],
            }
        )
    records.sort(key=lambda r: (r["pageStart"], r["id"]))

    return {
        "generated": "GENERATED by backend/tools/extract_reference.py — do not hand-edit.",
        "documentId": doc["id"],
        "sourceFile": doc["sourceFile"],
        "sourceSha256": hashlib.sha256(pdf_path.read_bytes()).hexdigest(),
        "passages": records,
    }


def main() -> None:
    manifest = json.loads((REFERENCE_DIR / "manifest.json").read_text())
    out_dir = REFERENCE_DIR / "passages"
    out_dir.mkdir(parents=True, exist_ok=True)
    for doc in manifest["documents"]:
        result = extract(doc)
        path = out_dir / f"{doc['id']}.json"
        path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
        words = [len(p["text"].split()) for p in result["passages"]]
        methods = collections.Counter(p["method"] for p in result["passages"])
        print(
            f"{doc['id']}: {len(words)} passages ({dict(methods)}), "
            f"words min {min(words)} / median {sorted(words)[len(words) // 2]} / max {max(words)}"
        )


if __name__ == "__main__":
    main()
