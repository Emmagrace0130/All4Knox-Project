# Checking the reference transcriptions

Eight passages the assistant can cite were transcribed by an AI model (Claude,
2026-09-15) from page images. The PDF text layer either omits them (embedded
images), scrambles them (tables), or drops meaning carried by colour. Until a
person checks them, every citation of one says *"transcribed from a page image
by an AI model; not yet checked by a person"*.

**Status:** Gerald checking, started 2026-09-15. Not yet recorded.

Slide numbers are the PDF page numbers.

## 1. TN buprenorphine guidelines — COWS

- **Transcription:** [`backend/app/data/reference/transcriptions/tn-bup-guidelines-2023.json`](../../backend/app/data/reference/transcriptions/tn-bup-guidelines-2023.json)
- **Source:** [`Bupe_Treatment_Guidelines_Fall_2023.pdf`](Bupe_Treatment_Guidelines_Fall_2023.pdf), **page 30** (Appendix C)

| Passage id | Check |
| --- | --- |
| `cows-items` | All 11 items, every point value and description. Several scales skip numbers on purpose (Restlessness 0/1/3/5, Pupil size 0/1/2/5, Gooseflesh 0/3/5). The source typo "chills of flushing" is kept and marked [sic]. |
| `cows-scoring` | "Give first dose when COWS score ≥ 7" and the four score bands (5-12, 13-24, 25-36, more than 36) |

## 2. TennCare BESMART Provider Education, May 28 2026

- **Transcription:** [`backend/app/data/reference/transcriptions/tenncare-besmart-education-2026-05.json`](../../backend/app/data/reference/transcriptions/tenncare-besmart-education-2026-05.json)
- **Source:** [`BESMART Provider Education May2026 Final.pdf`](BESMART%20Provider%20Education%20May2026%20Final.pdf)

| Slide | Passage id | Check |
| --- | --- | --- |
| **5** | `slide-05-dose-pa-table` | **Most important — the prescribing tool's TennCare dose limits rest on this slide and slide 4.** Each entry is tagged `[black]` (current state) or `[red]` (update) to match its colour on the slide. Check the tags, and that each entry is under the right prescriber (MD/DO vs NP/PA) and column (Dose Limits / PA Requirements / Monoproducts). |
| 9 | `slide-09-scopes-of-service` | Counseling vs psychotherapy bullets |
| 10 | `slide-10-qualified-providers` | Credential lists: LADAC II vs LADAC I, LPC vs LPC/MHSP, the PRO 22-001 (Rev. 2) policy number |
| 13 | `slide-13-billing-codes` | Every code against its phase and plan. The two BlueCare codes that differ from the other plans are G2172 HG (stabilization) and H2036 HG (maintenance without psychotherapy). |
| 18 | `slide-18-qrt-appointment-frequency` | Quality review standards 21–26, and the "skip standards" conditions |
| 19 | `slide-19-qrt-service-delivery` | Quality review standards 33–40 |

## Recording the check

1. Fix any wording directly in the passage's `text`.
2. Set `"checkedBy"` and `"checkedDate"` at the top of the file. They apply to
   every passage in that file, so only set them once all of its passages are
   checked.
3. Rebuild and verify:

   ```bash
   ./a4k reference      # regenerates passages/ from the PDFs + transcriptions
   git diff backend/app/data/reference/passages   # read it
   ./a4k test
   ./a4k rebuild api    # re-embeds on boot; citations update by themselves
   ```

4. Update item 2.5.11 in [`../project-plan.md`](../project-plan.md) and the
   status line above.

Changing `checkedBy` alone is enough for the live citations to change. The
index fingerprint covers citation labels as well as text (commit `7110124`).
