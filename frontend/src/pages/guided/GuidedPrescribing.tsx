import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { InterviewShell } from '../../components/guided/InterviewShell';
import { QuestionScreen } from '../../components/guided/QuestionScreen';
import { ResultScreen } from '../../components/guided/ResultScreen';
import { SelectionTiles } from '../../components/guided/SelectionTiles';
import { ResultCard } from '../../components/toolkit/ResultCard';
import { ClinicalAlert } from '../../components/toolkit/ClinicalAlert';
import { VerificationBadge } from '../../components/common/VerificationBadge';
import { useInterviewFlow } from '../../hooks/useInterviewFlow';
import type { InterviewStep } from '../../hooks/useInterviewFlow';
import { useVerifiedResult } from '../../hooks/useVerifiedResult';
import * as api from '../../services/api';
import {
  besmartOptions,
  coverageOptions,
  prescriberOptions,
} from '../../content/prescribing';
import {
  evaluatePrescribing,
  isPrescribingComplete,
} from '../../services/prescribingRules';
import type {
  BesmartStatus,
  Coverage,
  PrescriberType,
  PrescribingInput,
} from '../../types/clinical';

/**
 * Guided Tennessee prescribing pathway — skeleton §6, in the one-question-per-
 * screen form the McNabb Center asked for.
 *
 * Same content, same deterministic engine and same API verification as
 * /toolkit/prescribing; only the presentation differs.
 */
const steps: InterviewStep[] = [
  {
    id: 'coverage',
    kind: 'single',
    question: 'What insurance does the patient have?',
    subtext: 'This decides which Tennessee pathway applies.',
    options: coverageOptions,
    help: {
      body: (
        <p>
          Tennessee prescribing rules differ by payer. TennCare has its own
          prior-authorisation and dose rules, and uninsured patients may be
          better served by a grant-funded clinic.
        </p>
      ),
    },
  },
  {
    id: 'prescriber',
    kind: 'single',
    question: 'What type of clinician are you?',
    options: prescriberOptions,
    help: {
      body: (
        <p>
          Some Tennessee requirements differ between MD/DO and NP/PA
          prescribers, so the pathway shown depends on your role.
        </p>
      ),
    },
  },
  {
    id: 'besmart',
    kind: 'single',
    question: 'Are you a BESMART-enrolled prescriber?',
    subtext: 'Only asked for TennCare patients.',
    options: besmartOptions,
    // Skeleton §6: BESMART is a TennCare-only question.
    when: (answers) => answers.coverage === 'tenncare',
    help: {
      body: (
        <p>
          BESMART is TennCare&apos;s buprenorphine provider programme.
          Enrolment changes prior-authorisation requirements and dose limits.
        </p>
      ),
    },
  },
];

export function GuidedPrescribing() {
  const flow = useInterviewFlow(steps);

  const input: PrescribingInput = useMemo(
    () => ({
      coverage: (flow.answers.coverage as Coverage) ?? null,
      prescriber: (flow.answers.prescriber as PrescriberType) ?? null,
      besmart: (flow.answers.besmart as BesmartStatus) ?? null,
    }),
    [flow.answers],
  );

  const complete = isPrescribingComplete(input);
  const pathway = useMemo(
    () => (complete ? evaluatePrescribing(input) : null),
    [complete, input],
  );

  const verification = useVerifiedResult(
    pathway?.id ?? null,
    () => api.evaluatePrescribing(input).then((r) => r.pathway?.id ?? null),
    flow.atResult && complete,
  );

  return (
    <InterviewShell
      toolName="Can I prescribe?"
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
          heading="Here is your prescribing pathway"
          subtext="Based on the answers below. Edit any of them to see how the pathway changes."
          answers={flow.summary.map((s) => ({
            label: s.label,
            onEdit: () => flow.editStep(s.stepId),
          }))}
          actions={
            <>
              <button type="button" className="btn btn--ghost" onClick={flow.restart}>
                Start over
              </button>
              <Link to="/toolkit/prescribing" className="btn btn--ghost">
                Switch to the full view
              </Link>
            </>
          }
        >
          {pathway ? (
            <>
              <ResultCard
                guidance={{ ...pathway, title: 'Your Prescribing Pathway' }}
                details={pathway.details}
              />
              <VerificationBadge verification={verification} />
              {input.coverage === 'uninsured' ? (
                <p className="result-followup print-hide">
                  <Link to="/referrals">
                    Open the referral directory for grant-funded options →
                  </Link>
                </p>
              ) : null}
            </>
          ) : (
            <ClinicalAlert
              tone="pending"
              title="No pathway recorded for this combination"
            >
              <p>
                The current All4Knox content set does not document a pathway for
                this combination. Refer to the full clinical summary.
              </p>
            </ClinicalAlert>
          )}
        </ResultScreen>
      )}
    </InterviewShell>
  );
}
