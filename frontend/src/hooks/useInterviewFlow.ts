import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Drives the guided ("one question per screen") interview flow.
 *
 * The McNabb Center described the experience they wanted as TurboTax-like:
 * one question at a time, a visible progress bar, large tap targets, an
 * optional "why we ask", and — at the end — the answers echoed back so any of
 * them can be corrected without starting over.
 *
 * `src/components/guided/` implements those screens. This hook is the missing
 * piece: it sequences them, handles conditional questions, and lets the result
 * screen jump back to any single answer.
 *
 * It holds no clinical logic. Steps are declared by each tool page from the
 * content modules, and the answers it collects are handed to the same
 * deterministic engines the classic pages use.
 */

/** A single answer is one value; a multi-select answer is a list. */
export type InterviewAnswer = string | string[];
export type InterviewAnswers = Record<string, InterviewAnswer>;

export interface InterviewStep {
  id: string;
  /** The whole screen's heading — phrase it conversationally. */
  question: string;
  subtext?: string;
  help?: { label?: string; body: ReactNode };
  kind: 'single' | 'multi';
  options: readonly { value: string; label: string; hint?: string }[];
  /**
   * Conditional questions. Return false and the step is skipped entirely —
   * it never appears, and it never counts toward the progress total.
   * e.g. BESMART is only asked when the patient has TennCare.
   */
  when?: (answers: InterviewAnswers) => boolean;
  /**
   * Allow Continue with nothing selected. Used where "none" is a real,
   * meaningful answer rather than an unfinished one — see the UDS tool, which
   * needs an explicit all-negative screen.
   */
  optional?: boolean;
  /** Label for the forward button on this step. */
  continueLabel?: string;
}

export interface InterviewFlow {
  /** Steps currently reachable, after `when` predicates. */
  steps: InterviewStep[];
  /** Current step, or null once the flow has reached its result. */
  step: InterviewStep | null;
  /** 1-based, for the progress bar. Includes the result as the final screen. */
  position: number;
  total: number;
  answers: InterviewAnswers;
  atResult: boolean;
  canContinue: boolean;
  /** Single-select. Advances immediately — see note below. */
  select: (value: string) => void;
  /** Multi-select. Never auto-advances; the provider decides when done. */
  toggle: (value: string) => void;
  back: () => void;
  next: () => void;
  restart: () => void;
  /** Jump back to one question from the result screen's answer chips. */
  editStep: (stepId: string) => void;
  /** Answers so far, labelled, for the result screen. */
  summary: { stepId: string; label: string }[];
}

const asArray = (value: InterviewAnswer | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export function useInterviewFlow(allSteps: InterviewStep[]): InterviewFlow {
  const [answers, setAnswers] = useState<InterviewAnswers>({});
  const [index, setIndex] = useState(0);

  // Recomputed on every answer change, so answering "TennCare" makes the
  // BESMART question appear without any imperative wiring.
  const steps = useMemo(
    () => allSteps.filter((s) => (s.when ? s.when(answers) : true)),
    [allSteps, answers],
  );

  const clamped = Math.min(index, steps.length);
  const atResult = clamped >= steps.length;
  const step = atResult ? null : steps[clamped];

  const canContinue = useMemo(() => {
    if (!step) return false;
    if (step.optional) return true;
    return asArray(answers[step.id]).length > 0;
  }, [step, answers]);

  const select = useCallback(
    (value: string) => {
      if (!step) return;
      setAnswers((prev) => {
        const next = { ...prev, [step.id]: value };
        // Clear answers to questions that this change makes unreachable, so a
        // stale answer can never drive a result. Mirrors the classic pages,
        // which reset BESMART when the provider leaves TennCare.
        for (const other of allSteps) {
          if (other.id === step.id) continue;
          if (other.when && !other.when(next)) delete next[other.id];
        }
        return next;
      });
      // Single-select advances on its own: on a one-question screen, requiring
      // a second click on Continue is friction with no information in it.
      setIndex((i) => i + 1);
    },
    [step, allSteps],
  );

  const toggle = useCallback(
    (value: string) => {
      if (!step) return;
      setAnswers((prev) => {
        const current = asArray(prev[step.id]);
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [step.id]: next };
      });
    },
    [step],
  );

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => i + 1), []);
  const restart = useCallback(() => {
    setAnswers({});
    setIndex(0);
  }, []);

  const editStep = useCallback(
    (stepId: string) => {
      const target = steps.findIndex((s) => s.id === stepId);
      if (target >= 0) setIndex(target);
    },
    [steps],
  );

  const summary = useMemo(
    () =>
      steps
        .map((s) => {
          const values = asArray(answers[s.id]);
          const labels = values
            .map((v) => s.options.find((o) => o.value === v)?.label ?? v)
            .filter(Boolean);
          if (labels.length === 0) return null;
          return { stepId: s.id, label: labels.join(', ') };
        })
        .filter((v): v is { stepId: string; label: string } => v !== null),
    [steps, answers],
  );

  return {
    steps,
    step,
    // +1 because the result counts as the last screen in the progress bar.
    position: Math.min(clamped + 1, steps.length + 1),
    total: steps.length + 1,
    answers,
    atResult,
    canContinue,
    select,
    toggle,
    back,
    next,
    restart,
    editStep,
    summary,
  };
}
