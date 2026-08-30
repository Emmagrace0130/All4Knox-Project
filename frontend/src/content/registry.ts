import type {
  EntryStatus,
  ReviewMeta,
  SourceRef,
} from '../types/clinical';
import {
  dosingCravingsNo,
  dosingCravingsYes,
  dosingLimits,
  dosingOverview,
} from './dosing';
import { inductionPathways } from './induction';
import { buprenorphineBasics } from './learn';
import { prescribingPathways } from './prescribing';
import { referralOrganizations } from './referrals';
import { udsMonitoring, udsRules } from './uds';
import { CONTENT_VERSION } from './version';

/**
 * Every reviewable block of clinical content in one place, so
 * /clinical-sources can report the real state of the content set rather than a
 * hand-maintained list that drifts (skeleton §20: no silent rule changes).
 */
export interface RegistryEntry {
  id: string;
  title: string;
  module: string;
  route: string;
  source: SourceRef;
  review: ReviewMeta;
  contentVersion: string;
  entryStatus: EntryStatus;
}

export const contentRegistry: RegistryEntry[] = [
  ...prescribingPathways.map((p) => ({
    id: p.id,
    title: p.title,
    module: 'Tennessee prescribing',
    route: '/toolkit/prescribing',
    source: p.source,
    review: p.review,
    contentVersion: p.contentVersion,
    entryStatus: p.entryStatus,
  })),
  // Each induction outcome is its own reviewable block — a pathway's branches
  // can come from different slides and be reviewed independently.
  ...inductionPathways.flatMap((p) =>
    p.outcomes.map((o) => ({
      id: o.id,
      title: `${p.situationLabel} — ${o.title}`,
      module: 'Induction',
      route: '/toolkit/start',
      source: o.source,
      review: o.review,
      contentVersion: o.contentVersion,
      entryStatus: o.entryStatus,
    })),
  ),
  ...udsRules.map((r) => ({
    id: r.id,
    title: r.title,
    module: 'UDS interpretation',
    route: '/toolkit/uds',
    source: r.source,
    review: r.review,
    contentVersion: r.contentVersion,
    entryStatus: r.entryStatus,
  })),
  {
    id: 'dosing_overview',
    title: dosingOverview.title,
    module: 'Maintenance dosing',
    route: '/toolkit/dosing',
    source: dosingOverview.source,
    review: dosingOverview.review,
    contentVersion: dosingOverview.contentVersion,
    entryStatus: 'documented' as EntryStatus,
  },
  {
    id: 'dosing_limits',
    title: 'FDA label vs Tennessee dose limits',
    module: 'Maintenance dosing',
    route: '/toolkit/dosing',
    source: dosingLimits.source,
    review: dosingLimits.review,
    contentVersion: dosingLimits.contentVersion,
    entryStatus: 'documented' as EntryStatus,
  },
  ...[dosingCravingsNo, dosingCravingsYes].map((g) => ({
    id: g.id,
    title: g.title,
    module: 'Maintenance dosing',
    route: '/toolkit/dosing',
    source: g.source,
    review: g.review,
    contentVersion: g.contentVersion,
    entryStatus: g.entryStatus,
  })),
  {
    id: 'uds_monitoring',
    title: udsMonitoring.title,
    module: 'UDS interpretation',
    route: '/toolkit/uds',
    source: udsMonitoring.source,
    review: udsMonitoring.review,
    contentVersion: udsMonitoring.contentVersion,
    entryStatus: 'documented' as EntryStatus,
  },
  {
    id: 'learn_buprenorphine',
    title: buprenorphineBasics.title,
    module: 'Education',
    route: '/learn/buprenorphine',
    source: buprenorphineBasics.source,
    review: buprenorphineBasics.review,
    contentVersion: buprenorphineBasics.contentVersion,
    entryStatus: 'documented' as EntryStatus,
  },
  ...referralOrganizations.map((org) => ({
    id: `referral_${org.id}`,
    title: org.name,
    module: 'Referral directory',
    route: '/referrals',
    source: org.source,
    review: {
      reviewedBy: null,
      reviewedDate: org.lastVerified,
      effectiveDate: null,
      nextReviewDate: null,
    },
    contentVersion: CONTENT_VERSION,
    // Named in the summary, but contact details are still unverified.
    entryStatus: 'partial' as EntryStatus,
  })),
];

export const registryCounts = () => {
  const counts: Record<EntryStatus, number> = {
    documented: 0,
    partial: 0,
    pending: 0,
  };
  for (const entry of contentRegistry) counts[entry.entryStatus] += 1;
  return counts;
};

export const reviewedCount = () =>
  contentRegistry.filter((e) => e.review.reviewedDate !== null).length;
