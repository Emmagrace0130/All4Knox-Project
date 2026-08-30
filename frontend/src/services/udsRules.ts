import { udsRules } from '../content/uds';
import {
  OTHER_OPIOID_KEYS,
  STIMULANT_KEYS,
  UDS_ANALYTES,
} from '../types/clinical';
import type {
  UDSAnalyteKey,
  UDSMatch,
  UDSPanel,
  UDSResult,
} from '../types/clinical';

/**
 * Deterministic UDS rule evaluation (skeleton §23: rule-based, testable,
 * version-controlled — no model in the loop). Mirrors what
 * `POST /api/uds/interpret` will do server-side.
 */

export const emptyPanel = (): UDSPanel =>
  UDS_ANALYTES.reduce((acc, a) => {
    acc[a.key] = false;
    return acc;
  }, {} as UDSPanel);

export const anyDetected = (panel: UDSPanel): boolean =>
  UDS_ANALYTES.some((a) => panel[a.key]);

export const positiveKeys = (panel: UDSPanel): UDSAnalyteKey[] =>
  UDS_ANALYTES.filter((a) => panel[a.key]).map((a) => a.key);

export const analyteLabel = (key: UDSAnalyteKey): string => {
  const a = UDS_ANALYTES.find((x) => x.key === key);
  return a ? `${a.code} — ${a.label}` : key;
};

function matchesPanel(match: UDSMatch, panel: UDSPanel): boolean {
  if (match.bup !== undefined && panel.bup !== match.bup) return false;
  if (match.fent !== undefined && panel.fent !== match.fent) return false;

  if (match.anyStimulant !== undefined) {
    const stim = STIMULANT_KEYS.some((k) => panel[k]);
    if (stim !== match.anyStimulant) return false;
  }

  if (match.anyOtherOpioid !== undefined) {
    const other = OTHER_OPIOID_KEYS.some((k) => panel[k]);
    if (other !== match.anyOtherOpioid) return false;
  }

  // Slide 7's "*FENT or other opioid" footnote: fentanyl OR opiates/oxy/mtd.
  if (match.anyOpioid !== undefined) {
    const opioid = panel.fent || OTHER_OPIOID_KEYS.some((k) => panel[k]);
    if (opioid !== match.anyOpioid) return false;
  }

  if (match.allOthersNegative !== undefined) {
    const othersNegative = UDS_ANALYTES.filter((a) => a.key !== 'bup').every(
      (a) => !panel[a.key],
    );
    if (othersNegative !== match.allOthersNegative) return false;
  }

  return true;
}

/**
 * Returns every rule that applies, most relevant first, plus any positive
 * finding no matched rule speaks to. A combination with no matching rule
 * returns `primary: null` — the UI then says the combination is not documented
 * in the current summary instead of inventing guidance.
 */
export function interpretUDS(panel: UDSPanel): UDSResult {
  const matched = udsRules
    .filter((rule) => matchesPanel(rule.match, panel))
    .sort((a, b) => b.priority - a.priority);

  const superseded = new Set(matched.flatMap((r) => r.supersedes ?? []));
  const active = matched.filter((r) => !superseded.has(r.id));

  const addressed = new Set(active.flatMap((r) => r.addresses));
  const unaddressed = positiveKeys(panel).filter((k) => !addressed.has(k));

  const [primary, ...additional] = active;

  return {
    panel,
    primary: primary ?? null,
    additional,
    unaddressed,
  };
}
