import { inductionPathways } from '../content/induction';
import type {
  InductionOutcome,
  InductionPathway,
  InductionSituation,
} from '../types/clinical';

/** Mirrors `POST /api/induction/evaluate`. */

export const findPathway = (
  situation: InductionSituation | null,
): InductionPathway | null =>
  situation
    ? (inductionPathways.find((p) => p.situation === situation) ?? null)
    : null;

/** Every follow-up for the pathway has been answered. */
export const isInductionComplete = (
  pathway: InductionPathway | null,
  answers: Record<string, string>,
): boolean =>
  pathway !== null && pathway.followUps.every((f) => Boolean(answers[f.id]));

const matchesAnswers = (
  outcome: InductionOutcome,
  answers: Record<string, string>,
): boolean =>
  Object.entries(outcome.when ?? {}).every(([k, v]) => answers[k] === v);

const specificity = (outcome: InductionOutcome): number =>
  Object.keys(outcome.when ?? {}).length;

/**
 * Most specific outcome whose `when` clause matches. An outcome with no `when`
 * is the pathway default and matches everything.
 */
export function evaluateInduction(
  pathway: InductionPathway | null,
  answers: Record<string, string>,
): InductionOutcome | null {
  if (!pathway) return null;

  const matched = pathway.outcomes
    .filter((o) => matchesAnswers(o, answers))
    .sort((a, b) => specificity(b) - specificity(a));

  return matched[0] ?? null;
}
