import type { PrescribingPathway, SourceRef } from '../types/clinical';
import { CONTENT_VERSION, PENDING_REVIEW, sourceRef } from './version';

/**
 * Tennessee prescribing pathways — transcribed from the decision tree on
 * slide 2 of the All4Knox Clinical Summary 2026, with the TennCare dose limits
 * updated to TennCare's BESMART provider education of May 28, 2026.
 *
 * The tree as it now stands (changes from slide 2 marked *):
 *
 *   Person with OUD, >18yo
 *   ├── Insured
 *   │   ├── Private
 *   │   │   ├── MD/DO ......... 30d, max 20mg (24mg w/ addiction consult)
 *   │   │   └── NP/PA ......... 30d, max 16mg
 *   │   └── TennCare
 *   │       ├── Non-BESMART
 *   │       │   ├── MD/DO ..... * 16mg without PA; PA for >16mg up to 32mg
 *   │       │   └── NP/PA ..... Prior authorization required, limit 16mg (slide 2)
 *   │       └── BESMART ....... No prior authorization
 *   │           ├── MD/DO ..... * 30d, max 32mg preferred products
 *   │           └── NP/PA ..... 30d, max 16mg
 *   └── Uninsured ............. Refer to grant funded clinic: McNabb or Cherokee
 *
 * WHY THE TENNCARE LIMITS DIFFER FROM SLIDE 2 (content version 2026.2)
 * Slide 2 gives BESMART MD/DO prescribers 20 mg (24 mg with addiction
 * consultation) and requires prior authorization for every non-BESMART
 * prescriber. TennCare's May 28, 2026 update raised the BESMART MD/DO maximum
 * daily dose to 32 mg and, for non-BESMART MD/DO prescribers, requires prior
 * authorization only above 16 mg. The project chose to follow the newer payer
 * rule (Gerald Jones, 2026-09-15) and to raise the discrepancy with Dr.
 * Alexander, whose summary slide 2 is. Each changed pathway says so in its
 * considerations, so a clinician sees the disagreement rather than a silently
 * different number.
 *
 * Matching is by specificity: the pathway whose `match` sets the most fields
 * (all of which must agree with the provider's answers) wins.
 */

/** The TennCare update the TennCare dose limits now follow. */
const BESMART_2026: SourceRef = {
  document: 'TennCare BESMART Provider Education, May 28, 2026',
  location: 'Buprenorphine Dose and PA Process Changes; Process Updates for BESMART Providers (slides 4–5)',
  slide: 4,
};

/** Shown on every pathway whose limit now differs from slide 2. */
const SLIDE_2_DIFFERS =
  'This limit follows TennCare\'s May 28, 2026 BESMART update. The All4Knox Clinical Summary 2026 (slide 2) gives a different figure; the discrepancy is being confirmed with the McNabb Center.';

/**
 * The payer limit is not the whole rule. The Tennessee guidelines (Fall 2023,
 * Section II.D, p. 19) and TCA § 53-11-311 still set documentation and
 * consultation thresholds for sustained higher doses.
 */
const STATE_HIGH_DOSE_THRESHOLDS =
  'Tennessee guidelines (Fall 2023, p. 19): above 16 mg a day for more than 30 consecutive days, document in the medical record why the higher dose is required; above 20 mg a day for more than 30 consecutive days, consult with or refer to an addiction specialist.';

/** Slide 2 qualifies the NP/PA branches with this practice-setting condition. */
const NP_PA_SETTING =
  'NP/PA prescribers must work at an FQHC, CMHC, OBOT or hospital.';

/** Slide 2 roots the tree at this eligibility statement. */
export const prescribingEligibility = {
  text: 'Person with OUD, over 18 years old.',
  source: sourceRef('Prescribing decision tree', 2),
};

export const prescribingPathways: PrescribingPathway[] = [
  /* ---------------- Private insurance ---------------- */
  {
    id: 'rx_private_mddo',
    title: 'Private insurance · MD/DO',
    match: { coverage: 'private', prescriber: 'md_do' },
    interpretation:
      'You can prescribe buprenorphine-naloxone for up to 30 days.',
    actions: ['Prescribe buprenorphine-naloxone for up to 30 days.'],
    details: [
      { label: 'Prescription duration', value: 'Up to 30 days' },
      {
        label: 'Maximum dose',
        value: '20 mg, or 24 mg with addiction consultation',
      },
    ],
    source: sourceRef('Prescribing decision tree — Insured / Private / MD-DO', 2),
    review: PENDING_REVIEW,
    contentVersion: CONTENT_VERSION,
    entryStatus: 'documented',
  },
  {
    id: 'rx_private_nppa',
    title: 'Private insurance · NP/PA',
    match: { coverage: 'private', prescriber: 'np_pa' },
    interpretation:
      'You can prescribe buprenorphine-naloxone for up to 30 days, to a maximum of 16 mg.',
    actions: ['Prescribe buprenorphine-naloxone for up to 30 days.'],
    considerations: [NP_PA_SETTING],
    details: [
      { label: 'Prescription duration', value: 'Up to 30 days' },
      { label: 'Maximum dose', value: '16 mg' },
      { label: 'Practice setting', value: 'FQHC, CMHC, OBOT or hospital' },
    ],
    source: sourceRef('Prescribing decision tree — Insured / Private / NP-PA', 2),
    review: PENDING_REVIEW,
    contentVersion: CONTENT_VERSION,
    entryStatus: 'documented',
  },

  /* ---------------- TennCare · BESMART enrolled ---------------- */
  {
    id: 'rx_tenncare_besmart_mddo',
    title: 'TennCare · BESMART enrolled · MD/DO',
    match: { coverage: 'tenncare', prescriber: 'md_do', besmart: 'enrolled' },
    interpretation:
      'No prior authorization required for preferred buprenorphine-naloxone products up to 32 mg a day. You can prescribe for up to 30 days.',
    actions: [
      'Prescribe preferred buprenorphine-naloxone for up to 30 days — no prior authorization required up to 32 mg a day.',
      'Obtain prior authorization for non-preferred products, including monoproduct.',
    ],
    considerations: [SLIDE_2_DIFFERS, STATE_HIGH_DOSE_THRESHOLDS],
    details: [
      {
        label: 'Prior authorization',
        value: 'Not required for preferred products up to 32 mg; required for non-preferred products (including monoproduct)',
      },
      { label: 'Prescription duration', value: 'Up to 30 days' },
      { label: 'Maximum daily dose', value: '32 mg (preferred products)' },
      {
        label: 'Clinical Summary 2026 (slide 2)',
        value: '20 mg, or 24 mg with addiction consultation',
      },
    ],
    source: BESMART_2026,
    review: PENDING_REVIEW,
    contentVersion: CONTENT_VERSION,
    entryStatus: 'documented',
  },
  {
    id: 'rx_tenncare_besmart_nppa',
    title: 'TennCare · BESMART enrolled · NP/PA',
    match: { coverage: 'tenncare', prescriber: 'np_pa', besmart: 'enrolled' },
    interpretation:
      'No prior authorization required. You can prescribe for up to 30 days, to a maximum of 16 mg.',
    actions: [
      'Prescribe buprenorphine-naloxone for up to 30 days — no prior authorization required.',
    ],
    considerations: [NP_PA_SETTING],
    details: [
      { label: 'Prior authorization', value: 'Not required' },
      { label: 'Prescription duration', value: 'Up to 30 days' },
      { label: 'Maximum dose', value: '16 mg' },
      { label: 'Practice setting', value: 'FQHC, CMHC, OBOT or hospital' },
    ],
    source: sourceRef(
      'Prescribing decision tree — TennCare / BESMART / NP-PA',
      2,
    ),
    review: PENDING_REVIEW,
    contentVersion: CONTENT_VERSION,
    entryStatus: 'documented',
  },

  /* ---------------- TennCare · not BESMART enrolled ----------------
     Slide 2 gives one outcome for all non-BESMART providers. TennCare's May
     2026 update changes it for MD/DO prescribers only ("no changes for
     mid-level prescribers"), so the branch is split by prescriber type. */
  {
    id: 'rx_tenncare_not_besmart_mddo',
    title: 'TennCare · non-BESMART provider · MD/DO',
    match: { coverage: 'tenncare', prescriber: 'md_do', besmart: 'not_enrolled' },
    interpretation:
      'Up to 16 mg a day of preferred buprenorphine-naloxone products without prior authorization. Above 16 mg, up to 32 mg, requires prior authorization.',
    actions: [
      'Prescribe preferred buprenorphine-naloxone up to 16 mg a day without prior authorization.',
      'Obtain prior authorization for doses above 16 mg (up to 32 mg).',
      'Without an approved prior authorization above 16 mg, TennCare expects the patient to taper to 8 mg after 6 months.',
    ],
    considerations: [
      'This follows TennCare\'s May 28, 2026 BESMART update. The All4Knox Clinical Summary 2026 (slide 2) says prior authorization is required for every non-BESMART prescriber, with dosing limited to 16 mg; the discrepancy is being confirmed with the McNabb Center.',
      STATE_HIGH_DOSE_THRESHOLDS,
    ],
    details: [
      { label: 'Prior authorization', value: 'Required above 16 mg' },
      { label: 'Maximum daily dose', value: '16 mg without prior authorization; up to 32 mg with it' },
      {
        label: 'Clinical Summary 2026 (slide 2)',
        value: 'Prior authorization required; limit 16 mg',
      },
    ],
    source: BESMART_2026,
    review: PENDING_REVIEW,
    contentVersion: CONTENT_VERSION,
    entryStatus: 'documented',
  },
  {
    id: 'rx_tenncare_not_besmart_nppa',
    title: 'TennCare · non-BESMART provider · NP/PA',
    match: { coverage: 'tenncare', prescriber: 'np_pa', besmart: 'not_enrolled' },
    interpretation: 'Prior authorization is required, and dosing is limited to 16 mg.',
    actions: [
      'Obtain prior authorization before prescribing.',
      'Limit the dose to 16 mg.',
    ],
    details: [
      { label: 'Prior authorization', value: 'Required' },
      { label: 'Maximum dose', value: '16 mg' },
    ],
    considerations: [
      'Slide 2 applies this outcome to all non-BESMART providers without separating MD/DO from NP/PA.',
    ],
    gaps: [
      'TennCare\'s May 28, 2026 BESMART update states that "all mid-level prescribers must be BESMART". Whether a non-BESMART NP/PA can prescribe buprenorphine for a TennCare patient at all is unconfirmed.',
    ],
    source: sourceRef(
      'Prescribing decision tree — TennCare / non-BESMART provider',
      2,
    ),
    review: PENDING_REVIEW,
    contentVersion: CONTENT_VERSION,
    entryStatus: 'partial',
  },

  /* ---------------- Uninsured ---------------- */
  {
    id: 'rx_uninsured',
    title: 'Uninsured patient',
    match: { coverage: 'uninsured' },
    interpretation: 'Refer to a grant-funded clinic.',
    actions: ['Refer to a grant funded clinic: McNabb or Cherokee.'],
    source: sourceRef('Prescribing decision tree — Uninsured', 2),
    review: PENDING_REVIEW,
    contentVersion: CONTENT_VERSION,
    entryStatus: 'documented',
  },
];

export const coverageOptions = [
  { value: 'private', label: 'Private insurance' },
  { value: 'tenncare', label: 'TennCare' },
  { value: 'uninsured', label: 'Uninsured' },
] as const;

export const prescriberOptions = [
  { value: 'md_do', label: 'MD / DO' },
  { value: 'np_pa', label: 'NP / PA', hint: 'FQHC, CMHC, OBOT or hospital' },
] as const;

export const besmartOptions = [
  { value: 'enrolled', label: 'Yes' },
  { value: 'not_enrolled', label: 'No' },
] as const;
