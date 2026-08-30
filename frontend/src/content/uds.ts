import type { UDSRule } from '../types/clinical';
import { CONTENT_VERSION, PENDING_REVIEW, sourceRef } from './version';

/**
 * UDS interpretation rules — slides 6 and 7.
 *
 * Slide 7 gives the interpretation for each pattern; slide 6 gives the
 * follow-up actions for a patient already on Suboxone maintenance. Where both
 * cover a pattern, the interpretation comes from slide 7 and the actions from
 * slide 6.
 *
 * Slide 7 footnotes its fentanyl rows "*FENT or other opioid", so those rules
 * match `anyOpioid` (FENT, OPI, OXY or MTD) rather than fentanyl alone.
 */

/** Slide 12 — monitoring rationale, shown alongside the tool. */
export const udsMonitoring = {
  title: 'UDS at each appointment',
  points: [
    'Patients ideally should provide a UDS at each appointment.',
    'Some debate this because a UDS may not change the treatment plan — Suboxone is still provided whether the screen is positive or negative for opiates, methamphetamine and so on.',
    'A UDS at each appointment is nonetheless the gold standard: it helps confirm patients are taking Suboxone (BUP positive) and helps risk-stratify patients who may need additional resources, such as referral to a higher level of care.',
  ],
  source: sourceRef('Interpreting UDS Results', 12),
  review: PENDING_REVIEW,
  contentVersion: CONTENT_VERSION,
};

/** Applies to every rule that keys on "FENT*" in the source. */
export const OPIOID_FOOTNOTE =
  'Slide 7 footnotes this row "*FENT or other opioid", so it applies to fentanyl, opiates, oxycodone or methadone on the screen.';

export const udsRules: UDSRule[] = [
  {
    id: 'uds_bup_only',
    title: 'BUP positive only',
    match: { bup: true, allOthersNegative: true },
    priority: 10,
    addresses: ['bup'],
    interpretation: 'Appropriate — the expected result for a patient taking prescribed buprenorphine.',
    actions: ['Continue BUP.'],
    source: sourceRef('Interpreting UDS Results — BUP +', 7),
    review: PENDING_REVIEW,
    contentVersion: CONTENT_VERSION,
    entryStatus: 'documented',
  },
  {
    id: 'uds_bup_negative',
    title: 'BUP negative',
    match: { bup: false },
    priority: 5,
    addresses: ['bup'],
    interpretation: 'Not taking prescribed Suboxone.',
    considerations: [
      'Concern for diversion.',
      'Unable to start treatment.',
      'Other barriers.',
    ],
    actions: [],
    source: sourceRef('Interpreting UDS Results — BUP −', 7),
    review: PENDING_REVIEW,
    contentVersion: CONTENT_VERSION,
    entryStatus: 'documented',
  },
  {
    id: 'uds_bup_stimulant',
    title: 'BUP positive + stimulant positive',
    match: { bup: true, anyStimulant: true },
    priority: 20,
    addresses: ['bup', 'met', 'coc'],
    interpretation: 'Taking Suboxone and using a stimulant.',
    actions: [
      'Continue BUP.',
      'Continue Suboxone for OUD and address stimulant use.',
    ],
    considerations: [
      'Consider Wellbutrin if methamphetamine cravings.',
      'Frequent appointments while using methamphetamine.',
    ],
    source: sourceRef('Interpreting UDS Results — BUP+, MET/COC+', 7),
    review: PENDING_REVIEW,
    contentVersion: CONTENT_VERSION,
    entryStatus: 'documented',
  },
  {
    id: 'uds_bup_opioid',
    title: 'BUP positive + opioid positive',
    match: { bup: true, anyOpioid: true },
    priority: 30,
    addresses: ['bup', 'fent', 'opi', 'oxy', 'mtd'],
    interpretation: 'Taking Suboxone with continued opioid use.',
    actions: ['Continue BUP.'],
    considerations: [
      'Consider dose increase if ongoing opioid cravings.',
      'Frequent appointments, close follow-up.',
      'Narcan prescription.',
    ],
    escalation: [
      'Consider a higher dose if ongoing cravings, or higher level of care.',
    ],
    gaps: [OPIOID_FOOTNOTE],
    source: sourceRef('Interpreting UDS Results — BUP+, FENT*+', 7),
    review: PENDING_REVIEW,
    contentVersion: CONTENT_VERSION,
    entryStatus: 'documented',
  },
  {
    id: 'uds_bup_neg_opioid',
    title: 'BUP negative + opioid positive',
    match: { bup: false, anyOpioid: true },
    priority: 40,
    supersedes: ['uds_bup_negative'],
    addresses: ['bup', 'fent', 'opi', 'oxy', 'mtd'],
    interpretation:
      'Not taking Suboxone, with ongoing opioid use — the patient may have been unable to start BUP because of concern for precipitated withdrawal, or may be diverting.',
    actions: [
      'Advise the patient to wait 24 hrs, then rapid induction.',
      'Frequent appointments, close follow-up.',
      'Narcan prescription.',
    ],
    escalation: [
      'Consider higher level of care (inpatient detox) versus the patient being unable to start BUP due to concern for precipitated withdrawal.',
    ],
    gaps: [OPIOID_FOOTNOTE],
    source: sourceRef('Interpreting UDS Results — BUP −, FENT*+', 7),
    review: PENDING_REVIEW,
    contentVersion: CONTENT_VERSION,
    entryStatus: 'documented',
  },
];
