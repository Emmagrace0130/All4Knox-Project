import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { InterviewShell } from '../../components/guided/InterviewShell';
import { QuestionScreen } from '../../components/guided/QuestionScreen';
import { ResultScreen } from '../../components/guided/ResultScreen';
import { SelectionTiles } from '../../components/guided/SelectionTiles';
import { ClinicalAlert } from '../../components/toolkit/ClinicalAlert';
import { ResultCard } from '../../components/toolkit/ResultCard';
import { VerificationBadge } from '../../components/common/VerificationBadge';
import { useInterviewFlow } from '../../hooks/useInterviewFlow';
import type { InterviewStep } from '../../hooks/useInterviewFlow';
import { useVerifiedResult } from '../../hooks/useVerifiedResult';
import * as api from '../../services/api';
import { escalationBanner, inductionPathways } from '../../content/induction';
import { evaluateInduction, findPathway } from '../../services/inductionRules';
import type { InductionSituation } from '../../types/clinical';

/**
 * Guided induction decision aid — skeleton §7.
 *
 * The follow-up questions depend on which situation was chosen, so the step
 * list is built from every pathway's follow-ups and each one carries a `when`
 * predicate binding it to its situation. The flow hook then shows only the
 * reachable ones — and clears any answer that a later change makes
 * unreachable, so a stale answer from a different pathway can never drive a
 * result.
 */
const situationStep: InterviewStep = {
  id: 'situation',
  kind: 'single',
  question: 'Which best describes the patient?',
  subtext: 'Induction method depends on recent opioid exposure and tolerance.',
  options: inductionPathways.map((p) => ({
    value: p.situation,
    label: p.situationLabel,
    hint: p.udsDescription,
  })),
  help: {
    body: (
      <p>
        The main risk when starting buprenorphine is precipitated withdrawal.
        Which induction method is appropriate depends on what the patient has
        been using and how recently.
      </p>
    ),
  },
};

// One step per follow-up across every pathway, each gated to its situation.
const followUpSteps: InterviewStep[] = inductionPathways.flatMap((pathway) =>
  pathway.followUps.map((followUp) => ({
    id: followUp.id,
    kind: 'single' as const,
    question: followUp.question,
    options: followUp.options,
    when: (answers: Record<string, string | string[]>) =>
      answers.situation === pathway.situation,
  })),
);

const steps: InterviewStep[] = [situationStep, ...followUpSteps];

export function GuidedInduction() {
  const flow = useInterviewFlow(steps);

  const situation = (flow.answers.situation as InductionSituation) ?? null;
  const pathway = useMemo(() => findPathway(situation), [situation]);

  // Only the answers belonging to this pathway's follow-ups.
  const followUpAnswers = useMemo(() => {
    const out: Record<string, string> = {};
    for (const followUp of pathway?.followUps ?? []) {
      const value = flow.answers[followUp.id];
      if (typeof value === 'string') out[followUp.id] = value;
    }
    return out;
  }, [pathway, flow.answers]);

  const outcome = useMemo(
    () => (flow.atResult ? evaluateInduction(pathway, followUpAnswers) : null),
    [flow.atResult, pathway, followUpAnswers],
  );

  const verification = useVerifiedResult(
    outcome?.id ?? null,
    () =>
      api
        .evaluateInduction(situation, followUpAnswers)
        .then((r) => r.outcome?.id ?? null),
    flow.atResult && outcome !== null,
  );

  return (
    <InterviewShell
      toolName="Start Suboxone"
      current={flow.position}
      total={flow.total}
    >
      {flow.step ? (
        <QuestionScreen
          question={flow.step.question}
          subtext={flow.step.subtext}
          help={flow.step.help}
          onBack={flow.position > 1 ? flow.back : undefined}
        >
          <SelectionTiles
            name={flow.step.id}
            options={flow.step.options}
            value={(flow.answers[flow.step.id] as string) ?? null}
            onChange={flow.select}
          />
        </QuestionScreen>
      ) : (
        <ResultScreen
          heading="Here is the induction pathway"
          subtext="Based on the answers below. Edit any of them to see a different pathway."
          answers={flow.summary.map((s) => ({
            label: s.label,
            onEdit: () => flow.editStep(s.stepId),
          }))}
          actions={
            <>
              <button type="button" className="btn btn--ghost" onClick={flow.restart}>
                Start over
              </button>
              <Link to="/toolkit/start" className="btn btn--ghost">
                Switch to the full view
              </Link>
            </>
          }
        >
          {outcome ? (
            <>
              <ResultCard guidance={outcome} steps={outcome.steps} />
              <VerificationBadge verification={verification} />

              {outcome.considerInpatientDetox ? (
                <ClinicalAlert
                  tone="escalation"
                  title={escalationBanner.title}
                  footnote={`Source: ${escalationBanner.source.document}, slide ${escalationBanner.source.slide}.`}
                >
                  <p>{escalationBanner.body}</p>
                </ClinicalAlert>
              ) : null}

              {outcome.id === 'induction_on_suboxone_result' ? (
                <p className="result-followup print-hide">
                  <Link to="/toolkit/dosing">Review maintenance dosing →</Link>
                </p>
              ) : null}
            </>
          ) : (
            <ClinicalAlert
              tone="pending"
              title="No documented pathway for these answers"
            >
              <p>
                The current All4Knox content set does not document an induction
                pathway for this combination. Refer to the full clinical summary.
              </p>
            </ClinicalAlert>
          )}
        </ResultScreen>
      )}
    </InterviewShell>
  );
}
