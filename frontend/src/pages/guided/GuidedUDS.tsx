import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { InterviewShell } from '../../components/guided/InterviewShell';
import { QuestionScreen } from '../../components/guided/QuestionScreen';
import { ResultScreen } from '../../components/guided/ResultScreen';
import { CheckTiles } from '../../components/guided/SelectionTiles';
import { ClinicalAlert } from '../../components/toolkit/ClinicalAlert';
import { ResultCard } from '../../components/toolkit/ResultCard';
import { SourceBadge } from '../../components/toolkit/SourceBadge';
import { VerificationBadge } from '../../components/common/VerificationBadge';
import { useInterviewFlow } from '../../hooks/useInterviewFlow';
import type { InterviewStep } from '../../hooks/useInterviewFlow';
import { useVerifiedResult } from '../../hooks/useVerifiedResult';
import * as api from '../../services/api';
import { analyteLabel, emptyPanel, interpretUDS } from '../../services/udsRules';
import { UDS_ANALYTES } from '../../types/clinical';
import type { UDSAnalyteKey, UDSPanel } from '../../types/clinical';

/**
 * Guided UDS interpreter — skeleton §8.
 *
 * The step is `optional: true` so Continue works with nothing selected. That
 * is deliberate: an all-negative screen is a real, clinically meaningful
 * result, not an unfinished form. The result screen names it explicitly
 * ("No substances detected") so it can never be confused with a form the
 * provider simply did not fill in.
 */
const steps: InterviewStep[] = [
  {
    id: 'analytes',
    kind: 'multi',
    question: 'What did the screen detect?',
    subtext: 'Select every substance detected. Select nothing if the screen was negative.',
    optional: true,
    continueLabel: 'Interpret screen',
    options: UDS_ANALYTES.map((a) => ({
      value: a.key,
      label: a.code,
      hint: a.label,
    })),
    help: {
      body: (
        <p>
          Interpretation is based on which substances are present together — a
          buprenorphine-positive screen means something different alongside
          fentanyl than it does alone.
        </p>
      ),
    },
  },
];

export function GuidedUDS() {
  const flow = useInterviewFlow(steps);

  const selected = useMemo(
    () => (flow.answers.analytes as string[] | undefined) ?? [],
    [flow.answers],
  );

  const panel: UDSPanel = useMemo(() => {
    const next = emptyPanel();
    for (const key of selected) next[key as UDSAnalyteKey] = true;
    return next;
  }, [selected]);

  const result = useMemo(() => interpretUDS(panel), [panel]);

  const verification = useVerifiedResult(
    result.primary?.id ?? null,
    () => api.interpretUDS(panel).then((r) => r.primary?.id ?? null),
    flow.atResult,
  );

  const detected = selected.length > 0;

  return (
    <InterviewShell
      toolName="Interpret a UDS"
      current={flow.position}
      total={flow.total}
    >
      {flow.step ? (
        <QuestionScreen
          question={flow.step.question}
          subtext={flow.step.subtext}
          help={flow.step.help}
          onContinue={flow.next}
          continueLabel={
            detected ? 'Interpret screen' : 'Nothing was detected — continue'
          }
        >
          <CheckTiles
            name="analytes"
            options={flow.step.options}
            selected={selected}
            onToggle={flow.toggle}
            columns
          />
        </QuestionScreen>
      ) : (
        <ResultScreen
          heading={detected ? 'Here is the interpretation' : 'Screen recorded as negative'}
          subtext={
            detected
              ? 'Based on the substances below.'
              : 'No substances were selected as detected.'
          }
          answers={[
            {
              label: detected
                ? selected.map((k) => analyteLabel(k as UDSAnalyteKey)).join(', ')
                : 'No substances detected',
              onEdit: () => flow.editStep('analytes'),
            },
          ]}
          tone={detected ? 'neutral' : 'success'}
          actions={
            <>
              <button type="button" className="btn btn--ghost" onClick={flow.restart}>
                Start over
              </button>
              <Link to="/toolkit/uds" className="btn btn--ghost">
                Switch to the full view
              </Link>
            </>
          }
        >
          {result.primary ? (
            <>
              <ResultCard guidance={result.primary} />
              <VerificationBadge verification={verification} />

              {result.additional.length > 0 ? (
                <section className="secondary-results">
                  <h2 className="section-heading">Also applies</h2>
                  {result.additional.map((rule) => (
                    <article key={rule.id} className="secondary-result">
                      <h3>{rule.title}</h3>
                      {rule.interpretation ? <p>{rule.interpretation}</p> : null}
                      {rule.actions.length > 0 ? (
                        <ul className="list list--check">
                          {rule.actions.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      ) : null}
                      <SourceBadge
                        source={rule.source}
                        review={rule.review}
                        contentVersion={rule.contentVersion}
                      />
                    </article>
                  ))}
                </section>
              ) : null}

              {result.unaddressed.length > 0 ? (
                <ClinicalAlert
                  tone="warning"
                  title="Findings not addressed by the matched pathway"
                >
                  <ul className="list list--dot">
                    {result.unaddressed.map((key) => (
                      <li key={key}>{analyteLabel(key)}</li>
                    ))}
                  </ul>
                  <p>
                    The current All4Knox content set does not document a response
                    to these findings. Use clinical judgment and the full
                    clinical summary.
                  </p>
                </ClinicalAlert>
              ) : null}
            </>
          ) : (
            <ClinicalAlert
              tone="pending"
              title="No documented interpretation for this combination"
            >
              <p>
                The current All4Knox content set documents five UDS
                combinations, and this is not one of them. Detected:{' '}
                {detected
                  ? selected.map((k) => analyteLabel(k as UDSAnalyteKey)).join(', ')
                  : 'none'}
                .
              </p>
              <p>Refer to the full clinical summary and clinical judgment.</p>
            </ClinicalAlert>
          )}
        </ResultScreen>
      )}
    </InterviewShell>
  );
}
