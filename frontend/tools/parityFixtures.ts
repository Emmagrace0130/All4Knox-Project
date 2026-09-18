/**
 * Generates the parity fixture that locks the Python rule engines to the
 * TypeScript ones.
 *
 * The frontend keeps a local copy of the clinical logic so the toolkit still
 * works when the API is unreachable. That resilience is only safe if both
 * implementations agree exactly — otherwise a clinician could see different
 * guidance for the same inputs depending on whether the network was up, and
 * nobody would know which one they got.
 *
 * So we enumerate the ENTIRE input space of each decision tool (it is small
 * enough to do exhaustively), record what TypeScript decides, and make the
 * Python test suite assert the same answers. See backend/tests/test_parity.py.
 *
 * Run via `npm run export:parity`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { inductionPathways } from '../src/content/induction';
import { evaluateInduction, isInductionComplete } from '../src/services/inductionRules';
import {
  evaluatePrescribing,
  isPrescribingComplete,
  needsBesmart,
} from '../src/services/prescribingRules';
import { interpretUDS } from '../src/services/udsRules';
import { UDS_ANALYTES } from '../src/types/clinical';
import type {
  BesmartStatus,
  Coverage,
  PrescriberType,
  UDSPanel,
} from '../src/types/clinical';

const outDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../backend/tests/fixtures',
);

// --- UDS: all 2^8 = 256 possible panels ------------------------------------
const udsCases = [];
const analyteKeys = UDS_ANALYTES.map((a) => a.key);
for (let mask = 0; mask < 1 << analyteKeys.length; mask += 1) {
  const panel = {} as UDSPanel;
  analyteKeys.forEach((key, i) => {
    panel[key] = Boolean(mask & (1 << i));
  });
  const result = interpretUDS(panel);
  udsCases.push({
    panel,
    primary: result.primary?.id ?? null,
    additional: result.additional.map((r) => r.id),
    unaddressed: result.unaddressed,
  });
}

// --- Prescribing: every combination, including incomplete ones --------------
const coverages: (Coverage | null)[] = ['private', 'tenncare', 'uninsured', null];
const prescribers: (PrescriberType | null)[] = ['md_do', 'np_pa', null];
const besmarts: (BesmartStatus | null)[] = ['enrolled', 'not_enrolled', null];

const prescribingCases = [];
for (const coverage of coverages) {
  for (const prescriber of prescribers) {
    for (const besmart of besmarts) {
      const input = { coverage, prescriber, besmart };
      prescribingCases.push({
        input,
        pathway: evaluatePrescribing(input)?.id ?? null,
        complete: isPrescribingComplete(input),
        needsBesmart: needsBesmart(input),
      });
    }
  }
}

// --- Induction: every pathway x every combination of follow-up answers ------
const inductionCases = [];
for (const pathway of inductionPathways) {
  // Cartesian product of every option of every follow-up, plus unanswered.
  const combos: Record<string, string>[] = [{}];
  for (const followUp of pathway.followUps) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      next.push({ ...combo }); // leave this follow-up unanswered
      for (const option of followUp.options) {
        next.push({ ...combo, [followUp.id]: option.value });
      }
    }
    combos.length = 0;
    combos.push(...next);
  }
  for (const answers of combos) {
    inductionCases.push({
      situation: pathway.situation,
      answers,
      outcome: evaluateInduction(pathway, answers)?.id ?? null,
      complete: isInductionComplete(pathway, answers),
    });
  }
}

mkdirSync(outDir, { recursive: true });
const payload = {
  _generated:
    'DO NOT EDIT BY HAND. Generated from the TypeScript rule engines by frontend/tools/parityFixtures.ts.',
  _regenerate: 'cd frontend && npm run export:parity',
  _purpose:
    'Locks backend/app/services/rules.py to frontend/src/services/*.ts. A failure here means the two implementations disagree.',
  uds: udsCases,
  prescribing: prescribingCases,
  induction: inductionCases,
};
writeFileSync(resolve(outDir, 'parity.json'), `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `parity fixture: ${udsCases.length} UDS panels, ` +
    `${prescribingCases.length} prescribing combos, ` +
    `${inductionCases.length} induction combos -> ${outDir}/parity.json`,
);
