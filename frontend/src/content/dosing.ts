import type { ClinicalGuidance } from '../types/clinical';
import { CONTENT_VERSION, PENDING_REVIEW, sourceRef } from './version';

/** Suboxone dosing — slide 11. */
export const dosingOverview = {
  title: 'Suboxone Dosing',
  goal: 'Control cravings and reduce relapse risk.',
  highlights: [
    'Dose should be titrated to control cravings.',
    '"Cravings" are difficult to define and are inherently subjective — but a patient with cravings is at increased risk for relapse.',
    'Standard Suboxone dose is 16 mg per day.',
    'Often taken in divided doses of 8 mg BID, but can be taken once per day — patient preference.',
  ],
  source: sourceRef('Suboxone Dosing', 11),
  review: PENDING_REVIEW,
  contentVersion: CONTENT_VERSION,
};

/**
 * Slide 11 draws an explicit contrast between the FDA label and Tennessee
 * practice, and calls the Tennessee ceilings "arbitrary". Both are reproduced
 * because the gap between them is the clinically relevant point.
 */
export const dosingLimits = {
  fdaLabel: '8–24 mg per day (FDA approval and package insert).',
  tennessee: [
    'In Tennessee there is an "arbitrary" limit of 16 mg for NPs and PAs.',
    'In Tennessee there is an "arbitrary" limit of 20 mg for most physicians, unless they are addiction specialists.',
    'This is not true in most other states, where dosing follows medication guidelines.',
  ],
  referralNote:
    'Patients requiring doses above 16 mg or 20 mg per day can be referred to an addiction treatment specialist — McNabb, Cherokee/River Valley, ReVida or Cedar Recovery.',
  source: sourceRef('Suboxone Dosing — FDA label vs Tennessee limits', 11),
  review: PENDING_REVIEW,
  contentVersion: CONTENT_VERSION,
};

export const dosingCravingsNo: ClinicalGuidance = {
  id: 'dosing_no_cravings',
  title: 'Cravings controlled',
  interpretation:
    'The treatment goal — craving control — is currently being met.',
  actions: [
    'Continue the current maintenance dose.',
    'Reassess cravings at each follow-up visit.',
  ],
  source: sourceRef('Suboxone Dosing', 11),
  review: PENDING_REVIEW,
  contentVersion: CONTENT_VERSION,
  entryStatus: 'partial',
  gaps: [
    'Slide 11 states the titration principle rather than a "no cravings" branch; this restates that principle.',
  ],
};

export const dosingCravingsYes: ClinicalGuidance = {
  id: 'dosing_ongoing_cravings',
  title: 'Ongoing cravings',
  interpretation:
    'Titrate the dose to control cravings — a patient with cravings is at increased risk for relapse.',
  actions: [
    'Titrate the dose to control cravings.',
    'If the patient requires more than 16 mg (NP/PA) or 20 mg (most physicians) per day, refer to an addiction treatment specialist.',
  ],
  considerations: [
    'Current dose and whether it is divided (8 mg BID) or once daily.',
    'Adherence — confirm BUP positive on UDS.',
    'Continued opioid exposure on UDS.',
    'Tennessee dose ceiling for your prescriber type.',
  ],
  source: sourceRef('Suboxone Dosing', 11),
  review: PENDING_REVIEW,
  contentVersion: CONTENT_VERSION,
  entryStatus: 'documented',
};
