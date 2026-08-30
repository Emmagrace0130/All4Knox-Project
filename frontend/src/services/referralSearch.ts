import { referralOrganizations } from '../content/referrals';
import type {
  ReferralFilters,
  ReferralOrganization,
} from '../types/clinical';

/** Mirrors `GET /api/referrals`. */

export interface ReferralMatch {
  organization: ReferralOrganization;
  /**
   * True when the organisation was kept only because the relevant field has
   * not been verified yet. Unverified entries are never silently filtered out —
   * a missing record must not read as "does not offer this service".
   */
  uncertain: boolean;
  /** Filters that could not be confirmed for this organisation. */
  unverifiedAgainst: string[];
}

export const emptyFilters = (): ReferralFilters => ({
  region: null,
  coverage: null,
  needs: [],
});

export function searchReferrals(filters: ReferralFilters): ReferralMatch[] {
  return referralOrganizations
    .map((org): ReferralMatch | null => {
      const unverified: string[] = [];

      // Region is recorded for every entry, so this filter is strict.
      if (filters.region && !org.region.includes(filters.region)) return null;

      if (filters.coverage) {
        const field =
          filters.coverage === 'tenncare'
            ? org.acceptsTenncare
            : filters.coverage === 'private'
              ? org.acceptsPrivate
              : org.grantFunded;

        if (field === false) return null;
        if (field === null) unverified.push('patient coverage');
      }

      for (const need of filters.needs) {
        if (org.services.length === 0) {
          if (!unverified.includes('services')) unverified.push('services');
          continue;
        }
        if (!org.services.includes(need)) return null;
      }

      return {
        organization: org,
        uncertain: unverified.length > 0,
        unverifiedAgainst: unverified,
      };
    })
    .filter((m): m is ReferralMatch => m !== null);
}
