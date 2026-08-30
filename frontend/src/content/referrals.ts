import type {
  ReferralNeed,
  ReferralOrganization,
  ReferralRegion,
} from '../types/clinical';
import { sourceRef } from './version';

/**
 * Referral directory.
 *
 * Slide 11 names all four organisations as addiction treatment specialists to
 * whom patients requiring doses above the Tennessee ceiling can be referred.
 * Slide 2 names McNabb and Cherokee specifically as grant-funded clinics for
 * uninsured patients.
 *
 * The presentation contains no addresses, phone numbers, websites or payer
 * acceptance. Those fields stay `null` and render as "not yet verified" —
 * referral contact details must be verified and dated before a provider acts
 * on them.
 */
export const referralOrganizations: ReferralOrganization[] = [
  {
    id: 'mcnabb',
    name: 'McNabb',
    organizationType: 'Addiction treatment specialist',
    address: null,
    county: null,
    region: ['knoxville', 'east_tennessee'],
    phone: null,
    website: null,
    acceptsTenncare: null,
    acceptsPrivate: null,
    uninsuredOptions: 'Named as a grant funded clinic for uninsured patients.',
    grantFunded: true,
    services: ['addiction_specialist', 'grant_funded', 'outpatient_oud'],
    matAvailable: null,
    detoxAvailable: null,
    notes:
      'Slide 2: refer uninsured patients to a grant funded clinic — McNabb or Cherokee. Slide 11: addiction treatment specialist for patients requiring doses above the Tennessee limit.',
    lastVerified: null,
    source: sourceRef('Prescribing decision tree — Uninsured; Suboxone Dosing', 2),
  },
  {
    id: 'cherokee',
    name: 'Cherokee / River Valley',
    organizationType: 'Addiction treatment specialist',
    address: null,
    county: null,
    region: ['knoxville', 'east_tennessee'],
    phone: null,
    website: null,
    acceptsTenncare: null,
    acceptsPrivate: null,
    uninsuredOptions: 'Named as a grant funded clinic for uninsured patients.',
    grantFunded: true,
    services: ['addiction_specialist', 'grant_funded', 'outpatient_oud'],
    matAvailable: null,
    detoxAvailable: null,
    notes:
      'Slide 2: refer uninsured patients to a grant funded clinic — McNabb or Cherokee. Slide 11: addiction treatment specialist for patients requiring doses above the Tennessee limit.',
    lastVerified: null,
    source: sourceRef('Prescribing decision tree — Uninsured; Suboxone Dosing', 2),
  },
  {
    id: 'revida',
    name: 'ReVida',
    organizationType: 'Addiction treatment specialist',
    address: null,
    county: null,
    region: ['east_tennessee', 'tennessee'],
    phone: null,
    website: null,
    acceptsTenncare: null,
    acceptsPrivate: null,
    uninsuredOptions: null,
    grantFunded: null,
    services: ['addiction_specialist', 'outpatient_oud'],
    matAvailable: null,
    detoxAvailable: null,
    notes:
      'Slide 11: addiction treatment specialist for patients requiring doses above the Tennessee limit.',
    lastVerified: null,
    source: sourceRef('Suboxone Dosing — referral options', 11),
  },
  {
    id: 'cedar-recovery',
    name: 'Cedar Recovery',
    organizationType: 'Addiction treatment specialist',
    address: null,
    county: null,
    region: ['east_tennessee', 'tennessee'],
    phone: null,
    website: null,
    acceptsTenncare: null,
    acceptsPrivate: null,
    uninsuredOptions: null,
    grantFunded: null,
    services: ['addiction_specialist', 'outpatient_oud'],
    matAvailable: null,
    detoxAvailable: null,
    notes:
      'Slide 11: addiction treatment specialist for patients requiring doses above the Tennessee limit.',
    lastVerified: null,
    source: sourceRef('Suboxone Dosing — referral options', 11),
  },
];

/**
 * Slide 11 lists the four organisations followed by "etc.", so the directory is
 * explicitly not exhaustive.
 */
export const DIRECTORY_NOT_EXHAUSTIVE =
  'The clinical summary lists these organisations followed by "etc.", so this directory is not a complete list of Tennessee options.';

export const regionOptions: { value: ReferralRegion; label: string }[] = [
  { value: 'knoxville', label: 'Knoxville' },
  { value: 'east_tennessee', label: 'East Tennessee' },
  { value: 'tennessee', label: 'Tennessee' },
];

export const needOptions: { value: ReferralNeed; label: string }[] = [
  { value: 'addiction_specialist', label: 'Addiction specialist' },
  { value: 'inpatient_detox', label: 'Inpatient detox' },
  { value: 'outpatient_oud', label: 'Outpatient OUD treatment' },
  { value: 'grant_funded', label: 'Grant-funded treatment' },
  { value: 'psychiatry', label: 'Psychiatry' },
  { value: 'counseling', label: 'Counseling' },
  { value: 'recovery_support', label: 'Recovery support' },
];
