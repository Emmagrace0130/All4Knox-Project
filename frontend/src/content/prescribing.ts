import type { PrescribingPathway } from '../types/clinical';
import { CONTENT_VERSION, PENDING_REVIEW, sourceRef } from './version';

/**
 * Tennessee prescribing pathways — transcribed from the decision tree on
 * slide 2 of the All4Knox Clinical Summary 2026.
 *
 * The full tree:
 *
 *   Person with OUD, >18yo
 *   ├── Insured
 *   │   ├── Private
 *   │   │   ├── MD/DO ......... 30d, max 20mg (24mg w/ addiction consult)
 *   │   │   └── NP/PA ......... 30d, max 16mg
 *   │   └── TennCare
 *   │       ├── Non-BESMART ... Prior authorization required, limit 16mg
 *   │       └── BESMART ....... No prior authorization
 *   │           ├── MD/DO ..... 30d, max 20mg (24mg w/ addiction consult)
 *   │           └── NP/PA ..... 30d, max 16mg
 *   └── Uninsured ............. Refer to grant funded clinic: McNabb or Cherokee
 *
 * Matching is by specificity: the pathway whose `match` sets the most fields
 * (all of which must agree with the provider's answers) wins.
 */

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
      'No prior authorization required. You can prescribe for up to 30 days.',
    actions: [
      'Prescribe buprenorphine-naloxone for up to 30 days — no prior authorization required.',
    ],
    details: [
      { label: 'Prior authorization', value: 'Not required' },
      { label: 'Prescription duration', value: 'Up to 30 days' },
      {
        label: 'Maximum dose',
        value: '20 mg, or 24 mg with addiction consultation',
      },
    ],
    source: sourceRef(
      'Prescribing decision tree — TennCare / BESMART / MD-DO',
      2,
    ),
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
     Slide 2 branches on BESMART status before prescriber type, so this
     outcome is the same for MD/DO and NP/PA. */
  {
    id: 'rx_tenncare_not_besmart',
    title: 'TennCare · non-BESMART provider',
    match: { coverage: 'tenncare', besmart: 'not_enrolled' },
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
      'Slide 2 applies this outcome to non-BESMART providers without separating MD/DO from NP/PA.',
    ],
    source: sourceRef(
      'Prescribing decision tree — TennCare / non-BESMART provider',
      2,
    ),
    review: PENDING_REVIEW,
    contentVersion: CONTENT_VERSION,
    entryStatus: 'documented',
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
