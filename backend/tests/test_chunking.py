"""
The rules that turn a reference document's lines into passages.

Each test pins a defect that was actually found while extracting the three
reference PDFs, so a change to the rules cannot quietly bring one back.
"""

from app.rag.chunking import Line, Passage, Section, merge_tiny, pack, reflow, split_sections


def _lines(*texts, page=1):
    return [Line(page=page, text=t) for t in texts]


def test_hyphenated_line_break_keeps_the_hyphen():
    # "non-preferred" must survive; deleting the hyphen would be right only for
    # soft hyphenation, and these documents are full of real compounds.
    [(text, _, _)] = reflow(_lines("PA required for non-", "preferred products"))
    assert text == "PA required for non-preferred products"


def test_a_bare_statute_marker_starts_its_own_paragraph():
    # Found in TCA 53-11-311: "(c)" alone on a line was glued onto the end of
    # the previous sentence, hiding where subsection (c) begins.
    paras = [p[0] for p in reflow(_lines("appropriate for the patient.", "(c)", "(1) Notwithstanding"))]
    assert paras == ["appropriate for the patient.", "(c)", "(1) Notwithstanding"]


def test_symbol_font_bullets_are_normalised():
    [(text, _, _)] = reflow(_lines(" Programs should make every effort"))
    assert text == "• Programs should make every effort"


def test_slide_mode_keeps_group_headings_apart():
    # Found on BESMART slide 4: "For Non-BESMART MD / DO providers" was glued
    # onto the last BESMART item, blurring which dose rule applies to whom.
    lines = _lines(
        "3) Approved PA required for non-preferred products up to 32mg",
        "For Non-BESMART MD / DO providers",
        "1) Quantity limit ≤ 16 mg for preferred buprenorphine /",
        "naloxone products without PA",
    )
    paras = [p[0] for p in reflow(lines, slide=True)]
    assert paras == [
        "3) Approved PA required for non-preferred products up to 32mg",
        "For Non-BESMART MD / DO providers",
        "1) Quantity limit ≤ 16 mg for preferred buprenorphine / naloxone products without PA",
    ]
    # Prose mode would have joined the heading onto item 3.
    assert len(reflow(lines)) == 2


def test_wrapped_heading_is_joined_and_path_is_two_levels():
    lines = [
        Line(7, "Section I", 28, True),
        Line(7, "Prior to Treatment", 28, True),
        Line(10, "E. REQUIRED ELEMENTS REGARDING PREGNANCY AND NAS", 12, True),
        Line(10, "PREVENTION", 12, True),
        Line(10, "1. Body text.", 12, False),
    ]
    is_h1 = lambda ln: ln.bold and ln.size >= 20
    is_h2 = lambda ln: ln.bold and ln.size == 12 and ln.text[:2] == "E."
    cont = lambda prev, ln: ln.bold and (is_h1(ln) if is_h1(prev) else ln.text.isupper() and not is_h2(ln))
    [section] = split_sections(lines, is_h1, is_h2, cont)
    assert section.path == [
        "Section I: Prior to Treatment",
        "E. REQUIRED ELEMENTS REGARDING PREGNANCY AND NAS PREVENTION",
    ]
    assert [ln.text for ln in section.lines] == ["1. Body text."]


def test_numbered_items_are_never_split_when_they_fit():
    words = lambda n: " ".join(["word"] * n)
    section = Section(
        path=["D. GENERAL DOSING GUIDELINES"],
        lines=_lines(f"1. {words(100)}", f"a. {words(100)}", f"2. {words(100)}", f"a. {words(100)}"),
    )
    passages = pack(section, max_words=250)
    # Item 1 (with its sub-item) and item 2 (with its sub-item), never 1a + 2.
    assert [p.text.split("\n")[0][:2] for p in passages] == ["1.", "2."]
    assert all(p.section == ["D. GENERAL DOSING GUIDELINES"] for p in passages)


def test_an_oversized_item_splits_at_sub_items_then_sentences():
    long_sentence = "This sentence is ten words long for the test here. "
    section = Section(path=["X"], lines=_lines("1. Intro.", "a. " + long_sentence * 40))
    passages = pack(section, max_words=120)
    assert len(passages) > 2
    assert all(p.words <= 130 for p in passages)


def test_pages_span_the_lines_a_passage_came_from():
    section = Section(path=["X"], lines=[Line(17, "1. starts here"), Line(18, "and ends here")])
    [passage] = pack(section)
    assert (passage.page_start, passage.page_end) == (17, 18)


def test_tiny_passage_folds_into_the_next_one():
    tiny = Passage(["APPENDIX E"], 35, 35, "Source: Adapted from TIP 40")
    body = Passage(["E.1. ADOLESCENT TREATMENT"], 35, 35, " ".join(["word"] * 50))
    [merged] = merge_tiny([tiny, body])
    assert merged.text.startswith("Source: Adapted from TIP 40\n")
    assert merged.section == ["E.1. ADOLESCENT TREATMENT"]
