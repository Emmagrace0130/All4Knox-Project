import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { CheckboxGroup } from '../components/forms/CheckboxGroup';
import { PageContainer } from '../components/layout/PageContainer';
import { ClinicalAlert } from '../components/toolkit/ClinicalAlert';
import { ResultCard } from '../components/toolkit/ResultCard';
import { SourceBadge } from '../components/toolkit/SourceBadge';
import {
  analyteLabel,
  anyDetected,
  emptyPanel,
  interpretUDS,
  positiveKeys,
} from '../services/udsRules';
import { udsMonitoring } from '../content/uds';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { useVerifiedResult } from '../hooks/useVerifiedResult';
import * as api from '../services/api';
import { UDS_ANALYTES } from '../types/clinical';
import type { UDSAnalyteKey, UDSPanel } from '../types/clinical';

const options = UDS_ANALYTES.map((a) => ({
  value: a.key,
  label: a.code,
  hint: a.label,
}));

/** UDS interpreter — skeleton §8. Route: /toolkit/uds */
export function UDSInterpreter() {
  const [panel, setPanel] = useState<UDSPanel>(emptyPanel);
  /** Set by the explicit "nothing detected" action so an untouched form is
   *  never interpreted as an all-negative screen. */
  const [confirmedNegative, setConfirmedNegative] = useState(false);

  const detected = anyDetected(panel);
  const interpreted = detected || confirmedNegative;

  const result = useMemo(() => interpretUDS(panel), [panel]);
  const selected = positiveKeys(panel);

  // Rendered instantly from the local rules above, then confirmed against
  // the API. Both run the same logic (see backend/tests/test_parity.py).
  const verification = useVerifiedResult(
    result.primary?.id ?? null,
    () => api.interpretUDS(panel).then((r) => r.primary?.id ?? null),
    interpreted,
  );

  const toggle = (key: UDSAnalyteKey) => {
    setConfirmedNegative(false);
    setPanel((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const reset = () => {
    setPanel(emptyPanel());
    setConfirmedNegative(false);
  };

  const inputs = confirmedNegative && !detected
    ? ['No substances detected']
    : selected.map(analyteLabel);

  return (
    <PageContainer
      eyebrow="Clinical Decision Support"
      title="UDS Interpreter"
      lede="Select every substance detected on the screen. Interpretation updates as you go."
      backTo={{ to: '/', label: 'Toolkit' }}
    >
      <p className="mode-switch print-hide">
        <Link to="/toolkit/uds/guided">
          <span aria-hidden="true">◈</span> Use the guided walkthrough instead
        </Link>
      </p>

      <div className="tool-layout">
        <div className="tool-layout__steps print-hide">
          <CheckboxGroup
            name="uds"
            legend="Select all substances detected:"
            options={options}
            selected={selected}
            onToggle={toggle}
            layout="row"
          />
          <div className="button-row">
            <Button
              variant={confirmedNegative ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setPanel(emptyPanel());
                setConfirmedNegative(true);
              }}
            >
              Nothing detected on this screen
            </Button>
            {interpreted ? (
              <Button variant="ghost" size="sm" onClick={reset}>
                Clear
              </Button>
            ) : null}
          </div>

          <section className="intro-card">
            <h2 className="intro-card__title">{udsMonitoring.title}</h2>
            <ul className="list list--dot">
              {udsMonitoring.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <SourceBadge
              source={udsMonitoring.source}
              review={udsMonitoring.review}
              contentVersion={udsMonitoring.contentVersion}
            />
          </section>
        </div>

        <div className="tool-layout__result">
          {!interpreted ? (
            <p className="placeholder">
              Interpretation appears here once you record the screen result.
            </p>
          ) : result.primary ? (
            <>
              <ResultCard guidance={result.primary} inputs={inputs} />
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
                      {rule.considerations?.length ? (
                        <ul className="list list--dot">
                          {rule.considerations.map((c) => (
                            <li key={c}>{c}</li>
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
                {selected.map(analyteLabel).join(', ') || 'none'}.
              </p>
              <p>Refer to the full clinical summary and clinical judgment.</p>
            </ClinicalAlert>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
