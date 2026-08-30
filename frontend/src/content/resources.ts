/** Resources tab — skeleton §12. */

export interface ResourceItem {
  title: string;
  /** Internal route, when the toolkit already covers this material. */
  to?: string;
  /** External URL. Every external link is review-gated before production. */
  href?: string;
  /** Shown when the item is planned but not yet built. */
  status?: 'planned';
  note?: string;
}

export interface ResourceSection {
  id: string;
  title: string;
  description?: string;
  items: ResourceItem[];
}

export const resourceSections: ResourceSection[] = [
  {
    id: 'quick-guides',
    title: 'All4Knox Quick Guides',
    description: 'Short references drawn from the All4Knox clinical summary.',
    items: [
      { title: 'Starting buprenorphine', to: '/toolkit/start' },
      { title: 'Rapid induction reference', status: 'planned' },
      { title: 'UDS interpretation', to: '/toolkit/uds' },
      { title: 'Dosing and cravings', to: '/toolkit/dosing' },
      { title: 'Tennessee prescribing pathway', to: '/toolkit/prescribing' },
      { title: 'When to refer', to: '/referrals' },
    ],
  },
  {
    id: 'patient-handouts',
    title: 'Patient Handouts',
    description: 'Printable patient-facing material. Planned for Phase 2.',
    items: [
      { title: 'What is buprenorphine-naloxone?', status: 'planned' },
      { title: 'How to take sublingual medication', status: 'planned' },
      { title: 'What is precipitated withdrawal?', status: 'planned' },
      { title: 'Naloxone / overdose response', status: 'planned' },
      { title: 'What to expect at follow-up visits', status: 'planned' },
    ],
  },
  {
    id: 'clinical-forms',
    title: 'Clinical Forms',
    description: 'Planned for Phase 2.',
    items: [
      { title: 'OUD intake checklist', status: 'planned' },
      { title: 'Follow-up checklist', status: 'planned' },
      { title: 'UDS review template', status: 'planned' },
      { title: 'Treatment agreement template', status: 'planned' },
      { title: 'Referral form', status: 'planned' },
    ],
  },
];

/**
 * External clinical resources — skeleton §12 lists these organisations as
 * "potential future links" and requires review before production deployment.
 * Only each organisation's primary official site is linked.
 */
export const externalResources: ResourceItem[] = [
  {
    title: 'SAMHSA',
    href: 'https://www.samhsa.gov/',
    note: 'Substance Abuse and Mental Health Services Administration',
  },
  {
    title: 'U.S. Food and Drug Administration',
    href: 'https://www.fda.gov/',
    note: 'Labeling and safety communications',
  },
  {
    title: 'Tennessee Department of Mental Health and Substance Abuse Services',
    href: 'https://www.tn.gov/behavioral-health.html',
  },
  { title: 'TennCare', href: 'https://www.tn.gov/tenncare.html' },
  {
    title: 'ASAM',
    href: 'https://www.asam.org/',
    note: 'American Society of Addiction Medicine',
  },
  {
    title: 'PCSS',
    href: 'https://pcssnow.org/',
    note: 'Providers Clinical Support System — buprenorphine education',
  },
];

export const EXTERNAL_LINK_NOTICE =
  'External links have not yet been reviewed for this deployment. Confirm each destination before production use.';
