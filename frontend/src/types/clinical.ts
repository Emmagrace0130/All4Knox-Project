/**
 * Shared clinical content types.
 *
 * Skeleton §19: clinical guidance must NOT be hard-coded into React components.
 * Every piece of guidance rendered by this app is an object of one of these
 * shapes, defined under `src/content/`, so it can be reviewed, versioned and
 * later served verbatim by the FastAPI backend (§16–§18) without UI changes.
 */

/** Where a piece of guidance came from. */
export interface SourceRef {
  /** Source document title, e.g. "All4Knox Clinical Summary 2026". */
  document: string;
  /** Where inside the document, e.g. "Prescribing decision tree". */
  location?: string;
  /** Slide number in the source presentation. */
  slide?: number;
}

/**
 * Clinical review metadata (skeleton §20).
 * `null` means "not yet reviewed" and is rendered as a visible pending state —
 * it is never displayed as if review had happened.
 */
export interface ReviewMeta {
  reviewedBy: string | null;
  /** ISO date, e.g. "2026-01-15". */
  reviewedDate: string | null;
  effectiveDate: string | null;
  nextReviewDate: string | null;
}

/**
 * Entry status for a block of guidance.
 *
 * - `documented`  — the full guidance text exists in the source skeleton and is
 *                   reproduced here.
 * - `partial`     — some of the guidance is present, some is still missing.
 * - `pending`     — the pathway exists in the source presentation but its text
 *                   has not been entered into this toolkit yet. The UI says so
 *                   rather than inventing content.
 */
export type EntryStatus = 'documented' | 'partial' | 'pending';

/** Base shape for every reviewable block of clinical content. */
export interface ClinicalContent {
  id: string;
  title: string;
  source: SourceRef;
  review: ReviewMeta;
  contentVersion: string;
  entryStatus: EntryStatus;
}

/**
 * A guidance result shown to the provider after a decision step.
 * Mirrors the API response shape in skeleton §18.
 */
export interface ClinicalGuidance extends ClinicalContent {
  /** One-line answer. Skeleton §27: short answer before anything else. */
  interpretation?: string;
  /** Concrete next clinical actions. */
  actions: string[];
  /** Things to weigh that are not directive actions. */
  considerations?: string[];
  /** Higher-level-of-care / escalation messaging. */
  escalation?: string[];
  /** Anything the current source does not answer. */
  gaps?: string[];
}

/* ------------------------------------------------------------------ */
/* Urine drug screen                                                   */
/* ------------------------------------------------------------------ */

export const UDS_ANALYTES = [
  { key: 'bup', code: 'BUP', label: 'Buprenorphine' },
  { key: 'fent', code: 'FENT', label: 'Fentanyl' },
  { key: 'opi', code: 'OPI', label: 'Opiates' },
  { key: 'oxy', code: 'OXY', label: 'Oxycodone' },
  { key: 'mtd', code: 'MTD', label: 'Methadone' },
  { key: 'met', code: 'MET', label: 'Methamphetamine' },
  { key: 'coc', code: 'COC', label: 'Cocaine' },
  { key: 'other', code: 'OTHER', label: 'Other' },
] as const;

export type UDSAnalyteKey = (typeof UDS_ANALYTES)[number]['key'];

/** `true` = detected on the screen. */
export type UDSPanel = Record<UDSAnalyteKey, boolean>;

export const STIMULANT_KEYS: UDSAnalyteKey[] = ['met', 'coc'];
export const OTHER_OPIOID_KEYS: UDSAnalyteKey[] = ['opi', 'oxy', 'mtd'];

/**
 * Declarative match criteria for a UDS rule. Every specified field must hold.
 * Kept declarative (rather than a predicate function) so these rules can move
 * to `uds_rules.yaml` on the backend unchanged.
 */
export interface UDSMatch {
  bup?: boolean;
  fent?: boolean;
  /** MET or COC detected. */
  anyStimulant?: boolean;
  /** OPI, OXY or MTD detected. */
  anyOtherOpioid?: boolean;
  /**
   * FENT, OPI, OXY or MTD detected.
   *
   * Slide 7 footnotes its fentanyl branches "*FENT or other opioid", so those
   * rules match any opioid positive rather than fentanyl alone.
   */
  anyOpioid?: boolean;
  /** Every analyte other than BUP is negative. */
  allOthersNegative?: boolean;
}

export interface UDSRule extends ClinicalGuidance {
  match: UDSMatch;
  /** Higher wins when several rules match. */
  priority: number;
  /** Rule ids this rule makes redundant when both match. */
  supersedes?: string[];
  /** Positive findings this rule actually speaks to. */
  addresses: UDSAnalyteKey[];
}

export interface UDSResult {
  panel: UDSPanel;
  primary: UDSRule | null;
  /** Other matching rules, most relevant first. */
  additional: UDSRule[];
  /** Positive findings no matched rule addresses. */
  unaddressed: UDSAnalyteKey[];
}

/* ------------------------------------------------------------------ */
/* Tennessee prescribing pathway                                       */
/* ------------------------------------------------------------------ */

export type Coverage = 'private' | 'tenncare' | 'uninsured';
export type PrescriberType = 'md_do' | 'np_pa';
export type BesmartStatus = 'enrolled' | 'not_enrolled';

export interface PrescribingInput {
  coverage: Coverage | null;
  prescriber: PrescriberType | null;
  besmart: BesmartStatus | null;
}

/** Partial criteria; specificity (number of fields set) breaks ties. */
export interface PrescribingMatch {
  coverage?: Coverage;
  prescriber?: PrescriberType;
  besmart?: BesmartStatus;
}

export interface PrescribingPathway extends ClinicalGuidance {
  match: PrescribingMatch;
  /** Rendered as labelled rows in the result card, e.g. "Prescription duration". */
  details?: { label: string; value: string }[];
}

/* ------------------------------------------------------------------ */
/* Induction                                                           */
/* ------------------------------------------------------------------ */

export type InductionSituation =
  | 'fentanyl'
  | 'rx_opioid'
  | 'opioid_negative'
  | 'on_suboxone'
  | 'methadone';

export interface InductionFollowUp {
  id: string;
  question: string;
  options: { value: string; label: string }[];
}

/**
 * One end-point of the induction tree. `when` holds the follow-up answers that
 * select it; the outcome with the most matching keys wins. An outcome with no
 * `when` is the pathway's only/default result.
 */
export interface InductionOutcome extends ClinicalGuidance {
  when?: Record<string, string>;
  /** Ordered induction steps, exactly as written in the source. */
  steps: string[];
  /**
   * Slide 4 badges two pathways with a star, defined in its top-left legend as
   * "Consider Inpatient Detox".
   */
  considerInpatientDetox?: boolean;
}

export interface InductionPathway extends ClinicalContent {
  situation: InductionSituation;
  situationLabel: string;
  /** How the source describes the UDS for this situation. */
  udsDescription?: string;
  followUps: InductionFollowUp[];
  outcomes: InductionOutcome[];
}

/* ------------------------------------------------------------------ */
/* Referral directory                                                  */
/* ------------------------------------------------------------------ */

export type ReferralRegion = 'knoxville' | 'east_tennessee' | 'tennessee';

export type ReferralNeed =
  | 'addiction_specialist'
  | 'inpatient_detox'
  | 'outpatient_oud'
  | 'grant_funded'
  | 'psychiatry'
  | 'counseling'
  | 'recovery_support';

/**
 * Directory entry. Field names follow the YAML schema in skeleton §11 so the
 * structure survives the move to `referrals.json`.
 *
 * `null` = not yet verified. Contact details are deliberately left null rather
 * than guessed; the UI renders them as "not yet verified".
 */
export interface ReferralOrganization {
  id: string;
  name: string;
  organizationType: string | null;
  address: string | null;
  county: string | null;
  region: ReferralRegion[];
  phone: string | null;
  website: string | null;
  acceptsTenncare: boolean | null;
  acceptsPrivate: boolean | null;
  uninsuredOptions: string | null;
  grantFunded: boolean | null;
  services: ReferralNeed[];
  matAvailable: boolean | null;
  detoxAvailable: boolean | null;
  notes: string | null;
  lastVerified: string | null;
  source: SourceRef;
}

export interface ReferralFilters {
  region: ReferralRegion | null;
  coverage: Coverage | null;
  needs: ReferralNeed[];
}
