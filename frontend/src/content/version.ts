import type { ReviewMeta, SourceRef } from '../types/clinical';

/** Current clinical content version (skeleton §20). */
export const CONTENT_VERSION = '2026.1';

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
