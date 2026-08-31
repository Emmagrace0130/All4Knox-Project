import { Link } from 'react-router-dom';
import { InterviewShell } from '../../components/guided/InterviewShell';
import { QuestionScreen } from '../../components/guided/QuestionScreen';
import { ResultScreen } from '../../components/guided/ResultScreen';
import { SelectionTiles } from '../../components/guided/SelectionTiles';
import { ResultCard } from '../../components/toolkit/ResultCard';
import { VerificationBadge } from '../../components/common/VerificationBadge';
import { useInterviewFlow } from '../../hooks/useInterviewFlow';
import type { InterviewStep } from '../../hooks/useInterviewFlow';
import { useVerifiedResult } from '../../hooks/useVerifiedResult';
import * as api from '../../services/api';
import {
  dosingCravingsNo,
  dosingCravingsYes,
  dosingOverview,
} from '../../content/dosing';

/** Guided maintenance dosing — skeleton §9. */
const steps: InterviewStep[] = [
  {
    id: 'cravings',
    kind: 'single',
    question: 'Is the patient continuing to experience opioid cravings?',
    subtext: `Treatment goal: ${dosingOverview.goal.toLowerCase()}`,
    options: [
      { value: 'no', label: 'No', hint: 'Cravings are controlled on the current dose' },
      { value: 'yes', label: 'Yes', hint: 'Cravings are ongoing' },
    ],
    help: {
      body: (
        <p>
          Buprenorphine is titrated to control cravings. Whether cravings
          persist is the main thing that determines the next step, which is why
          it is the only question here.
        </p>
      ),
    },
  },
];

export function GuidedDosing() {
  const flow = useInterviewFlow(steps);
  const cravings = flow.answers.cravings as string | undefined;

  const guidance =
    cravings === 'yes'
      ? dosingCravingsYes
      : cravings === 'no'
        ? dosingCravingsNo
        : null;

  const verification = useVerifiedResult(
    guidance?.id ?? null,
    () =>
      api
        .reviewDosing(cravings === undefined ? null : cravings === 'yes')
        .then((r) => r.guidance?.id ?? null),
    flow.atResult && guidance !== null,
  );

  return (
    <InterviewShell
      toolName="Dose & cravings"
      current={flow.position}
      total={flow.total}
    >
      {flow.step ? (
        <QuestionScreen
          question={flow.step.question}
          subtext={flow.step.subtext}
          help={flow.step.help}
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
          heading={
            cravings === 'yes' ? 'Cravings are continuing' : 'Cravings are controlled'
          }
          subtext="Review the dosing guidance below."
          answers={flow.summary.map((s) => ({
            label: `Ongoing cravings: ${s.label.toLowerCase()}`,
            onEdit: () => flow.editStep(s.stepId),
          }))}
          tone={cravings === 'yes' ? 'neutral' : 'success'}
          actions={
            <>
              <button type="button" className="btn btn--ghost" onClick={flow.restart}>
                Start over
              </button>
              <Link to="/toolkit/dosing" className="btn btn--ghost">
                Switch to the full view
              </Link>
            </>
          }
        >
          {guidance ? (
            <>
              <ResultCard guidance={guidance} />
              <VerificationBadge verification={verification} />
            </>
          ) : null}
        </ResultScreen>
      )}
    </InterviewShell>
  );
}
