import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RadioGroup } from '../components/forms/RadioGroup';
import { PageContainer } from '../components/layout/PageContainer';
import { ResultCard } from '../components/toolkit/ResultCard';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { useVerifiedResult } from '../hooks/useVerifiedResult';
import * as api from '../services/api';
import { SourceBadge } from '../components/toolkit/SourceBadge';
import {
  dosingCravingsNo,
  dosingCravingsYes,
  dosingLimits,
  dosingOverview,
} from '../content/dosing';

const cravingOptions = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
] as const;

type Cravings = (typeof cravingOptions)[number]['value'];

/** Maintenance dosing — skeleton §9. Route: /toolkit/dosing */
export function DosingTool() {
  const [cravings, setCravings] = useState<Cravings | null>(null);

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
        .reviewDosing(cravings === null ? null : cravings === 'yes')
        .then((r) => r.guidance?.id ?? null),
    guidance !== null,
  );

  return (
    <PageContainer
      eyebrow="Clinical Decision Support"
      title={dosingOverview.title}
      lede={`Primary treatment goal: ${dosingOverview.goal.toLowerCase()}`}
      backTo={{ to: '/', label: 'Toolkit' }}
    >
      <p className="mode-switch print-hide">
        <Link to="/toolkit/dosing/guided">
          <span aria-hidden="true">◈</span> Use the guided walkthrough instead
        </Link>
      </p>

      <div className="tool-layout">
        <div className="tool-layout__steps">
          <section className="intro-card">
            <h2 className="intro-card__title">Current summary highlights</h2>
            <ul className="list list--dot">
              {dosingOverview.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <SourceBadge
              source={dosingOverview.source}
              review={dosingOverview.review}
              contentVersion={dosingOverview.contentVersion}
            />
          </section>

          <section className="intro-card">
            <h2 className="intro-card__title">FDA label vs Tennessee limits</h2>
            <dl className="result__details">
              <div>
                <dt>FDA label</dt>
                <dd>{dosingLimits.fdaLabel}</dd>
              </div>
            </dl>
            <ul className="list list--dot">
              {dosingLimits.tennessee.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="intro-card__emphasis">
              {dosingLimits.referralNote}{' '}
              <Link to="/referrals" className="print-hide">
                Open referrals →
              </Link>
            </p>
            <p className="intro-card__link">
              <Link to="/toolkit/prescribing" className="print-hide">
                Check your prescriber-type ceiling in TN Prescribing →
              </Link>
            </p>
            <SourceBadge
              source={dosingLimits.source}
              review={dosingLimits.review}
              contentVersion={dosingLimits.contentVersion}
            />
          </section>

          <section className="prompt-card print-hide">
            <RadioGroup
              name="cravings"
              legend="Is the patient continuing to experience opioid cravings?"
              options={cravingOptions}
              value={cravings}
              onChange={setCravings}
            />
          </section>
        </div>

        <div className="tool-layout__result">
          {guidance ? (
            <>
            <ResultCard
              guidance={guidance}
              inputs={[
                cravings === 'yes'
                  ? 'Ongoing cravings: yes'
                  : 'Ongoing cravings: no',
              ]}
            />
              <VerificationBadge verification={verification} />
            </>
          ) : (
            <p className="placeholder">
              Answer the cravings prompt to see next steps.
            </p>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
