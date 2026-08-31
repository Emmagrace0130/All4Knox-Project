import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RadioGroup } from '../components/forms/RadioGroup';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/common/Button';
import { ClinicalAlert } from '../components/toolkit/ClinicalAlert';
import { DecisionStep } from '../components/toolkit/DecisionStep';
import { ResultCard } from '../components/toolkit/ResultCard';
import {
  besmartOptions,
  coverageOptions,
  prescribingEligibility,
  prescriberOptions,
} from '../content/prescribing';
import {
  evaluatePrescribing,
  isPrescribingComplete,
  needsBesmart,
} from '../services/prescribingRules';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { useVerifiedResult } from '../hooks/useVerifiedResult';
import * as api from '../services/api';
import type {
  BesmartStatus,
  Coverage,
  PrescriberType,
  PrescribingInput,
} from '../types/clinical';

const labelFor = <T extends string>(
  options: readonly { value: T; label: string }[],
  value: T | null,
) => options.find((o) => o.value === value)?.label ?? null;

/** Tennessee prescribing pathway — skeleton §6. Route: /toolkit/prescribing */
export function PrescribingTool() {
  const [input, setInput] = useState<PrescribingInput>({
    coverage: null,
    prescriber: null,
    besmart: null,
  });

  const showBesmart = needsBesmart(input);
  const complete = isPrescribingComplete(input);
  const pathway = useMemo(
    () => (complete ? evaluatePrescribing(input) : null),
    [complete, input],
  );

  const verification = useVerifiedResult(
    pathway?.id ?? null,
    () => api.evaluatePrescribing(input).then((r) => r.pathway?.id ?? null),
    complete,
  );

  const setCoverage = (coverage: Coverage) =>
    // Clear BESMART when leaving TennCare so a stale answer can't drive a result.
    setInput((prev) => ({
      ...prev,
      coverage,
      besmart: coverage === 'tenncare' ? prev.besmart : null,
    }));

  const inputSummary = [
    labelFor(coverageOptions, input.coverage),
    labelFor(prescriberOptions, input.prescriber),
    showBesmart
      ? input.besmart === 'enrolled'
        ? 'BESMART enrolled'
        : 'Not BESMART enrolled'
      : null,
  ].filter((v): v is string => Boolean(v));

  return (
    <PageContainer
      eyebrow="Clinical Decision Support"
      title="Tennessee Prescribing Pathway"
      lede="Answer up to three questions to see the prescribing pathway recorded in the current All4Knox summary."
      backTo={{ to: '/', label: 'Toolkit' }}
    >
      <div className="tool-layout">
        <div className="tool-layout__steps print-hide">
          <ClinicalAlert tone="info" title="Applies to">
            <p>{prescribingEligibility.text}</p>
          </ClinicalAlert>

          <DecisionStep step={1} title="Patient coverage">
            <RadioGroup
              name="coverage"
              legend="What insurance does the patient have?"
              options={coverageOptions}
              value={input.coverage}
              onChange={setCoverage}
            />
          </DecisionStep>

          <DecisionStep step={2} title="Prescriber type" disabled={!input.coverage}>
            <RadioGroup
              name="prescriber"
              legend="What type of clinician are you?"
              options={prescriberOptions}
              value={input.prescriber}
              onChange={(prescriber: PrescriberType) =>
                setInput((prev) => ({ ...prev, prescriber }))
              }
            />
          </DecisionStep>

          {showBesmart ? (
            <DecisionStep
              step={3}
              title="TennCare provider status"
              hint="Asked only for TennCare patients."
            >
              <RadioGroup
                name="besmart"
                legend="Are you a BESMART-enrolled prescriber?"
                options={besmartOptions}
                value={input.besmart}
                onChange={(besmart: BesmartStatus) =>
                  setInput((prev) => ({ ...prev, besmart }))
                }
              />
            </DecisionStep>
          ) : null}

          {complete ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setInput({ coverage: null, prescriber: null, besmart: null })
              }
            >
              Start over
            </Button>
          ) : null}
        </div>

        <div className="tool-layout__result">
          {!complete ? (
            <p className="placeholder">
              Your prescribing pathway appears here once the questions above are
              answered.
            </p>
          ) : pathway ? (
            <>
              <ResultCard
                guidance={{ ...pathway, title: 'Your Prescribing Pathway' }}
                inputs={inputSummary}
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
                The current All4Knox content set has no entry for this
                combination of coverage, prescriber type and BESMART status.
                Verify requirements with the payer before prescribing.
              </p>
            </ClinicalAlert>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
