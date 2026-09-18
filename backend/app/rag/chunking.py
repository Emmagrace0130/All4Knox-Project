"""
Splits a reference document into retrievable passages along its own structure.

Everything here is a pure function over lines that have already been read out
of a PDF (see `backend/tools/extract_reference.py`). Keeping the PDF library
out of this module means the splitting rules are unit-tested in the normal
test run, and the API image never needs a PDF parser.

WHY SPLIT BY STRUCTURE, NOT BY A FIXED WINDOW
---------------------------------------------
A fixed 500-token window routinely cuts a numbered requirement in half, so the
retrieved passage says "3. The prescriber shall document..." without the
condition in item 2 that triggers it. The Tennessee guideline is written as
lettered sections of numbered items with lettered sub-items, so passages are
built from whole numbered items, and each carries the heading path it sits
under. A passage is only split below item level when one item alone is too
long to embed well.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Callable

# nomic-embed-text reads ~2k tokens, but retrieval precision drops well before
# that: a long passage matches many questions weakly. ~320 words keeps one or
# two numbered requirements per passage.
MAX_WORDS = 320

# A line starting with one of these begins a new paragraph rather than
# continuing the previous line. The marker may end the line: statute
# subsections are often set as a bare "(c)" on a line of their own, and must
# not be glued onto the end of the previous sentence.
_LIST_MARKER = re.compile(
    r"^(\d{1,2}[.)]|[a-z]\.|[ivx]{1,4}\.|\(\w{1,3}\)|[•▪◦o-])(\s|$)"
)
# Word's Symbol-font bullets arrive as private-use code points.
_BULLET_GLYPHS = str.maketrans({"\uf0b7": "\u2022", "\uf0a7": "\u25aa"})
# A top-level numbered item: the unit passages are built from.
_TOP_LEVEL = re.compile(r"^\d{1,2}\.\s")
_SENTENCE_END = re.compile(r"(?<=[.;:])\s+(?=[A-Z(])")


@dataclass
class Line:
    """One text line as read from the page, with the styling used to classify it."""

    page: int
    text: str
    size: float = 0.0
    bold: bool = False


@dataclass
class Section:
    path: list[str]
    lines: list[Line] = field(default_factory=list)


@dataclass
class Passage:
    section: list[str]
    page_start: int
    page_end: int
    text: str

    @property
    def words(self) -> int:
        return len(self.text.split())


LineTest = Callable[[Line], bool]
ContinuationTest = Callable[[Line, Line], bool]


def split_sections(
    lines: list[Line],
    is_h1: LineTest,
    is_h2: LineTest,
    continues_heading: ContinuationTest | None = None,
) -> list[Section]:
    """
    Group lines under a two-level heading path.

    `continues_heading(previous_heading_line, line)` lets a heading that wraps
    onto a second line ("...PREGNANCY AND NAS" / "PREVENTION") be joined back
    together instead of being read as body text.
    """
    sections: list[Section] = []
    h1: str | None = None
    h2: str | None = None
    current = Section(path=[])
    last_heading: tuple[str, Line] | None = None  # ("h1"|"h2", line)

    def flush() -> None:
        nonlocal current
        if current.lines:
            sections.append(current)
        current = Section(path=[p for p in (h1, h2) if p])

    for line in lines:
        text = line.text.strip()
        if not text:
            continue

        if last_heading and continues_heading and continues_heading(last_heading[1], line):
            if last_heading[0] == "h1":
                h1 = f"{h1}: {text}" if h1 and ":" not in h1 else f"{h1} {text}"
            else:
                h2 = f"{h2} {text}"
            current.path = [p for p in (h1, h2) if p]
            last_heading = (last_heading[0], line)
            continue

        if is_h1(line):
            h1, h2 = text, None
            flush()
            last_heading = ("h1", line)
        elif is_h2(line):
            h2 = text
            flush()
            last_heading = ("h2", line)
        else:
            current.lines.append(line)
            last_heading = None

    flush()
    return sections


def reflow(lines: list[Line], slide: bool = False) -> list[tuple[str, int, int]]:
    """
    Join wrapped lines back into paragraphs. Returns (text, page_start, page_end).

    A line ending in a hyphen joins the next WITHOUT a space but keeps the
    hyphen: "long-" + "acting" -> "long-acting". Removing it would be right for
    soft hyphenation and wrong for every compound word, and these documents are
    full of compounds (non-preferred, high-potency, evidence-based).

    `slide=True` is for presentation slides, where short lines carry meaning of
    their own: a line starting with a capital also starts a new paragraph. On
    prose that would split sentences; on a slide it stops a group heading
    ("For Non-BESMART MD / DO providers") being glued onto the last item of the
    previous group.
    """
    paragraphs: list[list] = []
    for line in lines:
        text = line.text.strip().translate(_BULLET_GLYPHS)
        if not text:
            continue
        starts_group = slide and text[:1].isupper()
        if not paragraphs or _LIST_MARKER.match(text) or starts_group:
            paragraphs.append([text, line.page, line.page])
            continue
        para = paragraphs[-1]
        joiner = "" if para[0].endswith("-") and text[:1].islower() else " "
        para[0] = f"{para[0]}{joiner}{text}"
        para[2] = line.page
    return [(p[0], p[1], p[2]) for p in paragraphs]


def _split_long(text: str, max_words: int) -> list[str]:
    """Last resort for one paragraph longer than max_words: split at sentences."""
    pieces, current = [], []
    for sentence in _SENTENCE_END.split(text):
        if current and len(" ".join(current + [sentence]).split()) > max_words:
            pieces.append(" ".join(current))
            current = []
        current.append(sentence)
    if current:
        pieces.append(" ".join(current))
    return pieces


def merge_tiny(passages: list[Passage], min_words: int = 25) -> list[Passage]:
    """
    Fold a passage too short to stand alone into the one after it.

    A lone attribution line ("Source: Adapted from TIP 40...") embeds as a
    near-empty vector that scores oddly against everything. It is kept, as the
    opening of the next passage, rather than dropped.
    """
    merged: list[Passage] = []
    carry: Passage | None = None
    for passage in passages:
        if carry is not None:
            passage = Passage(
                section=passage.section,
                page_start=min(carry.page_start, passage.page_start),
                page_end=max(carry.page_end, passage.page_end),
                text=f"{carry.text}\n{passage.text}",
            )
            carry = None
        if passage.words < min_words:
            carry = passage
            continue
        merged.append(passage)
    if carry is not None:  # a tiny final passage has nothing after it
        merged.append(carry)
    return merged


def pack(section: Section, max_words: int = MAX_WORDS, slide: bool = False) -> list[Passage]:
    """
    Build passages from whole numbered items, packing neighbours together up to
    `max_words`. An item is split into its sub-items only when it alone exceeds
    the limit, and a sub-item into sentences only when that still does.
    """
    paragraphs = reflow(section.lines, slide=slide)
    if not paragraphs:
        return []

    # Group paragraphs into top-level items.
    items: list[list[tuple[str, int, int]]] = []
    for para in paragraphs:
        if not items or _TOP_LEVEL.match(para[0]):
            items.append([para])
        else:
            items[-1].append(para)

    # Break any item that is too long into smaller units.
    units: list[list[tuple[str, int, int]]] = []
    for item in items:
        if sum(len(p[0].split()) for p in item) <= max_words:
            units.append(item)
            continue
        for text, start, end in item:
            if len(text.split()) <= max_words:
                units.append([(text, start, end)])
            else:
                units.extend([(piece, start, end)] for piece in _split_long(text, max_words))

    passages: list[Passage] = []
    buffer: list[tuple[str, int, int]] = []

    def emit() -> None:
        if buffer:
            passages.append(
                Passage(
                    section=list(section.path),
                    page_start=min(p[1] for p in buffer),
                    page_end=max(p[2] for p in buffer),
                    text="\n".join(p[0] for p in buffer),
                )
            )
            buffer.clear()

    for unit in units:
        unit_words = sum(len(p[0].split()) for p in unit)
        buffered = sum(len(p[0].split()) for p in buffer)
        if buffer and buffered + unit_words > max_words:
            emit()
        buffer.extend(unit)
    emit()
    return passages
