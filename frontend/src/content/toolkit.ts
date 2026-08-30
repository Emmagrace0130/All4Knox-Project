/** Landing page configuration — skeleton §5 and §25. */

export interface ToolkitCardDef {
  id: string;
  title: string;
  purpose: string;
  cta: string;
  to: string;
}

export const toolkitCards: ToolkitCardDef[] = [
  {
    id: 'prescribing',
    title: 'Can I Prescribe?',
    purpose:
      'Determine prescribing pathway based on insurance and clinician type.',
    cta: 'Check Prescribing Pathway',
    to: '/toolkit/prescribing',
  },
  {
    id: 'start',
    title: 'Start Suboxone',
    purpose: 'Select an induction pathway based on recent opioid exposure.',
    cta: 'Choose Induction Method',
    to: '/toolkit/start',
  },
  {
    id: 'uds',
    title: 'Interpret a UDS',
    purpose:
      'Respond to BUP, fentanyl, methamphetamine, cocaine, opioid, oxycodone or methadone findings.',
    cta: 'Interpret UDS',
    to: '/toolkit/uds',
  },
  {
    id: 'dosing',
    title: 'Dose & Cravings',
    purpose:
      'Review maintenance dose guidance and next steps when cravings continue.',
    cta: 'Review Dosing',
    to: '/toolkit/dosing',
  },
  {
    id: 'referrals',
    title: 'Find Treatment / Refer',
    purpose:
      'Tennessee and Knoxville-area higher-level-of-care, specialty and grant-funded options.',
    cta: 'Find Referral Options',
    to: '/referrals',
  },
  {
    id: 'resources',
    title: 'Quick Clinical Resources',
    purpose:
      'Printable guides, patient education, naloxone information and external clinical resources.',
    cta: 'Open Resources',
    to: '/resources',
  },
];

/** "What do you need help with?" shortcuts — skeleton §5. */
export const quickStartLinks = [
  { label: 'I am starting a new patient', to: '/toolkit/start' },
  { label: 'My patient has an unexpected UDS', to: '/toolkit/uds' },
  { label: 'My patient is still having cravings', to: '/toolkit/dosing' },
  { label: 'I need a referral', to: '/referrals' },
  { label: 'I need TN prescribing information', to: '/toolkit/prescribing' },
];
