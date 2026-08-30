import { prescribingPathways } from '../content/prescribing';
import type {
  PrescribingInput,
  PrescribingMatch,
  PrescribingPathway,
} from '../types/clinical';

/** Mirrors `POST /api/prescribing/evaluate`. */

function matchesInput(match: PrescribingMatch, input: PrescribingInput): boolean {
  if (match.coverage !== undefined && match.coverage !== input.coverage)
    return false;
  if (match.prescriber !== undefined && match.prescriber !== input.prescriber)
    return false;
  if (match.besmart !== undefined && match.besmart !== input.besmart)
    return false;
  return true;
}

const specificity = (match: PrescribingMatch): number =>
  Object.values(match).filter((v) => v !== undefined).length;

/** BESMART status is only asked when the patient has TennCare (skeleton §6). */
export const needsBesmart = (input: PrescribingInput): boolean =>
  input.coverage === 'tenncare';

export const isPrescribingComplete = (input: PrescribingInput): boolean => {
  if (!input.coverage || !input.prescriber) return false;
  if (needsBesmart(input) && !input.besmart) return false;
  return true;
};

/** Most specific matching pathway, or `null` when none applies. */
export function evaluatePrescribing(
  input: PrescribingInput,
): PrescribingPathway | null {
  const matched = prescribingPathways
    .filter((p) => matchesInput(p.match, input))
    .sort((a, b) => specificity(b.match) - specificity(a.match));

  return matched[0] ?? null;
}
