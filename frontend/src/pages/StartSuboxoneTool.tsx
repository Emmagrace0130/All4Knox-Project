import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { RadioGroup } from '../components/forms/RadioGroup';
import { PageContainer } from '../components/layout/PageContainer';
import { ClinicalAlert } from '../components/toolkit/ClinicalAlert';
import { DecisionStep } from '../components/toolkit/DecisionStep';
import { ResultCard } from '../components/toolkit/ResultCard';
import {
  escalationBanner,
  inductionIntro,
  inductionPathways,
} from '../content/induction';
import {
  evaluateInduction,
  findPathway,
  isInductionComplete,
} from '../services/inductionRules';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { useVerifiedResult } from '../hooks/useVerifiedResult';
import * as api from '../services/api';
import type { InductionSituation } from '../types/clinical';

const situationOptions = inductionPathways.map((p) => ({
  value: p.situation,
  label: p.situationLabel,
  hint: p.udsDescription,
}));

/** Induction decision aid — slides 3, 4 and 5. Route: /toolkit/start */
export function StartSuboxoneTool() {
  const [situation, setSituation] = useState<InductionSituation | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const pathway = useMemo(() => findPathway(situation), [situation]);
  const complete = isInductionComplete(pathway, answers);
  const outcome = useMemo(
    () => (complete ? evaluateInduction(pathway, answers) : null),
    [complete, pathway, answers],
  );

  const verification = useVerifiedResult(
    outcome?.id ?? null,
    () =>
      api
        .evaluateInduction(situation, answers)
        .then((r) => r.outcome?.id ?? null),
    complete,
  );

  const inputs = pathway
    ? [
        pathway.situationLabel,
        ...pathway.followUps.map((f) => {
          const option = f.options.find((o) => o.value === answers[f.id]);
          return option ? option.label : '';
        }),
      ].filter(Boolean)
    : [];

  const reset = () => {
    setSituation(null);
    setAnswers({});
  };

  return (
    <PageContainer
      eyebrow="Clinical Decision Support"
      title="Start Suboxone"
      lede="Choose an induction method based on recent substance use and level of tolerance."
      backTo={{ to: '/', label: 'Toolkit' }}
    >
      <p className="mode-switch print-hide">
        <Link to="/toolkit/start/guided">
          <span aria-hidden="true">◈</span> Use the guided walkthrough instead
        </Link>
      </p>

      <section className="intro-card print-hide">
        <h2 className="intro-card__title">{inductionIntro.title}</h2>
        <ol className="list list--numbered">
          {inductionIntro.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="intro-card__emphasis">{inductionIntro.emphasis}</p>
        <p className="intro-card__link">
          <Link to="/learn/buprenorphine#precipitated-withdrawal">
            What is precipitated withdrawal? →
          </Link>
        </p>
      </section>

      <div className="tool-layout">
        <div className="tool-layout__steps print-hide">
          <DecisionStep step={1} title="Current patient situation">
            <RadioGroup
              name="situation"
              legend="Which best describes the patient?"
              options={situationOptions}
              value={situation}
              onChange={(next: InductionSituation) => {
                setSituation(next);
                setAnswers({});
              }}
              layout="column"
            />
          </DecisionStep>

          {pathway && pathway.followUps.length > 0 ? (
            <DecisionStep step={2} title="Recent use and UDS">
              {pathway.followUps.map((followUp) => (
                <RadioGroup
                  key={followUp.id}
                  name={followUp.id}
                  legend={followUp.question}
                  options={followUp.options}
                  value={answers[followUp.id] ?? null}
                  onChange={(value: string) =>
                    setAnswers((prev) => ({ ...prev, [followUp.id]: value }))
                  }
                />
              ))}
            </DecisionStep>
          ) : null}

          {situation ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              Start over
            </Button>
          ) : null}
        </div>

        <div className="tool-layout__result">
          {!pathway ? (
            <p className="placeholder">
              The induction method appears here once you describe the patient.
            </p>
          ) : !complete ? (
            <p className="placeholder">
              Answer the remaining question to see the induction method.
            </p>
          ) : outcome ? (
            <>
              <ResultCard
                guidance={outcome}
                inputs={inputs}
                steps={outcome.steps}
              />
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
                  <Link to="/toolkit/dosing">
                    Review maintenance dosing and cravings →
                  </Link>
                </p>
              ) : null}
            </>
          ) : (
            <ClinicalAlert
              tone="pending"
              title="No induction method recorded for these answers"
            >
              <p>
                The current content set has no entry for this combination. Refer
                to the full clinical summary.
              </p>
            </ClinicalAlert>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
