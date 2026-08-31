/**
 * Exports every block of clinical content to JSON for the FastAPI backend.
 *
 * WHY THIS EXISTS
 * ---------------
 * The clinical guidance in `src/content/` was transcribed from the All4Knox
 * Clinical Summary 2026 by hand, once, and reviewed against the source slides.
 * Re-typing it into YAML for the backend would create a second copy that can
 * silently drift from the first — and a drifted copy of clinical guidance is
 * the most dangerous defect this project can ship (skeleton §21: "no silent
 * rule changes").
 *
 * So the backend does not get its own transcription. It gets THIS export:
 * mechanically generated, byte-identical to what the reviewed frontend
 * modules contain. `src/content/` stays the single source of truth.
 *
 * Run via `npm run export:content` (see package.json). Regenerate after ANY
 * edit to `src/content/` and commit the resulting JSON.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  dosingCravingsNo,
  dosingCravingsYes,
  dosingLimits,
  dosingOverview,
} from '../src/content/dosing';
import {
  DECISION_SUPPORT_LABEL,
  DECISION_SUPPORT_NOTE,
  EDUCATIONAL_LABEL,
  EMERGENCY_NOTICE,
  PHI_NOTICE,
  plannedTools,
} from '../src/content/governance';
import {
  escalationBanner,
  inductionIntro,
  inductionPathways,
} from '../src/content/induction';
import { buprenorphineBasics } from '../src/content/learn';
import {
  besmartOptions,
  coverageOptions,
  prescriberOptions,
  prescribingEligibility,
  prescribingPathways,
} from '../src/content/prescribing';
import {
  DIRECTORY_NOT_EXHAUSTIVE,
  needOptions,
  referralOrganizations,
  regionOptions,
} from '../src/content/referrals';
import { contentRegistry } from '../src/content/registry';
import {
  EXTERNAL_LINK_NOTICE,
  externalResources,
  resourceSections,
} from '../src/content/resources';
import { quickStartLinks, toolkitCards } from '../src/content/toolkit';
import { OPIOID_FOOTNOTE, udsMonitoring, udsRules } from '../src/content/uds';
import {
  CONTENT_REVIEW,
  CONTENT_VERSION,
  SOURCE_DOCUMENT,
} from '../src/content/version';

const outDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../backend/app/data/content',
);

/** Files the backend loads at startup. One file per clinical module. */
const bundles: Record<string, unknown> = {
  version: {
    contentVersion: CONTENT_VERSION,
    sourceDocument: SOURCE_DOCUMENT,
    review: CONTENT_REVIEW,
  },
  governance: {
    decisionSupportLabel: DECISION_SUPPORT_LABEL,
    decisionSupportNote: DECISION_SUPPORT_NOTE,
    educationalLabel: EDUCATIONAL_LABEL,
    emergencyNotice: EMERGENCY_NOTICE,
    phiNotice: PHI_NOTICE,
    plannedTools,
  },
  prescribing: {
    eligibility: prescribingEligibility,
    pathways: prescribingPathways,
    coverageOptions,
    prescriberOptions,
    besmartOptions,
  },
  induction: {
    intro: inductionIntro,
    escalationBanner,
    pathways: inductionPathways,
  },
  uds: {
    monitoring: udsMonitoring,
    opioidFootnote: OPIOID_FOOTNOTE,
    rules: udsRules,
  },
  dosing: {
    overview: dosingOverview,
    limits: dosingLimits,
    cravingsNo: dosingCravingsNo,
    cravingsYes: dosingCravingsYes,
  },
  referrals: {
    organizations: referralOrganizations,
    regionOptions,
    needOptions,
    notExhaustiveNotice: DIRECTORY_NOT_EXHAUSTIVE,
  },
  learn: { buprenorphine: buprenorphineBasics },
  resources: {
    sections: resourceSections,
    external: externalResources,
    externalLinkNotice: EXTERNAL_LINK_NOTICE,
  },
  toolkit: { cards: toolkitCards, quickStart: quickStartLinks },
  registry: { entries: contentRegistry },
};

mkdirSync(outDir, { recursive: true });

const header = {
  _generated:
    'DO NOT EDIT BY HAND. Generated from frontend/src/content by tools/exportContent.ts.',
  _regenerate: 'cd frontend && npm run export:content',
  _sourceOfTruth: 'frontend/src/content/',
};

let total = 0;
for (const [name, payload] of Object.entries(bundles)) {
  const file = resolve(outDir, `${name}.json`);
  writeFileSync(file, `${JSON.stringify({ ...header, ...(payload as object) }, null, 2)}\n`);
  const count = Array.isArray(payload) ? payload.length : Object.keys(payload as object).length;
  console.log(`  ${name.padEnd(12)} -> ${name}.json  (${count} keys)`);
  total += 1;
}
console.log(`\nExported ${total} content bundles to ${outDir}`);
