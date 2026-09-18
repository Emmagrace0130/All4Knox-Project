import type { ReviewMeta, SourceRef } from '../types/clinical';

/**
 * Current clinical content version (skeleton §20). Bump on any change to
 * clinical guidance, and say what changed here.
 *
 *   2026.1  Transcribed from the All4Knox Clinical Summary 2026.
 *   2026.2  TennCare dose limits follow TennCare's BESMART update of May 28,
 *           2026: BESMART MD/DO max 32 mg (was 20 mg, 24 mg with addiction
 *           consultation); non-BESMART MD/DO 16 mg without prior
 *           authorization, up to 32 mg with it (was PA always, 16 mg); the
 *           non-BESMART branch is split by prescriber type. Dosing page notes
 *           the update. Discrepancy with slide 2 / slide 11 to be confirmed
 *           with Dr. Alexander.
 */
export const CONTENT_VERSION = '2026.2';

export const SOURCE_DOCUMENT = 'All4Knox Clinical Summary 2026';

export const sourceRef = (location?: string, slide?: number): SourceRef => ({
  document: SOURCE_DOCUMENT,
  location,
  slide,
});

/**
 * Review state for content that has been transcribed from the skeleton but has
 * NOT yet been signed off by a clinical reviewer. Every block currently uses
 * this. Filling these fields is a deliberate, reviewed action — see §20.
 */
export const PENDING_REVIEW: ReviewMeta = {
  reviewedBy: null,
  reviewedDate: null,
  effectiveDate: null,
  nextReviewDate: null,
};

/**
 * Toolkit-wide review status shown in the footer and on /clinical-sources.
 * Nothing here is fabricated: unreviewed content reports itself as unreviewed.
 */
export const CONTENT_REVIEW: ReviewMeta = PENDING_REVIEW;
