import type { ReactNode } from 'react';
import {
  DECISION_SUPPORT_LABEL,
  DECISION_SUPPORT_NOTE,
  EDUCATIONAL_LABEL,
} from '../../content/governance';
import type { ClinicalGuidance } from '../../types/clinical';
import { ClinicalAlert } from './ClinicalAlert';
import { SourceBadge } from './SourceBadge';

interface ResultCardProps {
  guidance: ClinicalGuidance;
  /** Skeleton §21: educational content and decision support are distinguished. */
  kind?: 'decision-support' | 'educational';
  /** The provider's inputs, echoed back so the result is never unlabelled. */
  inputs?: string[];
  details?: { label: string; value: string }[];
  /** Ordered protocol steps, e.g. an induction method. */
  steps?: string[];
  stepsLabel?: string;
  children?: ReactNode;
}

/**
 * The single result surface for every tool.
 *
 * Skeleton §27 ordering: short answer → next clinical actions → read more →
 * source + version. Skeleton §7: never present a result as an unlabelled
 * calculator output.
 */
export function ResultCard({
  guidance,
  kind = 'decision-support',
  inputs,
  details,
  steps,
  stepsLabel = 'Induction method',
  children,
}: ResultCardProps) {
  const resolvedDetails = details ?? [];
  const hasActions = guidance.actions.length > 0;
  const hasConsiderations = (guidance.considerations?.length ?? 0) > 0;
  const hasGaps = (guidance.gaps?.length ?? 0) > 0;

  return (
    <article className="result">
      <header className="result__header">
        <p className="result__kind">
          {kind === 'decision-support' ? DECISION_SUPPORT_LABEL : EDUCATIONAL_LABEL}
          {kind === 'decision-support' ? (
            <span className="result__kind-note">{DECISION_SUPPORT_NOTE}</span>
          ) : null}
        </p>
        <h2 className="result__title">{guidance.title}</h2>
        {inputs && inputs.length > 0 ? (
          <ul className="result__inputs">
            {inputs.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        ) : null}
      </header>

      {guidance.interpretation ? (
        <p className="result__answer">{guidance.interpretation}</p>
      ) : null}

      {guidance.entryStatus === 'pending' ? (
        <ClinicalAlert
          tone="pending"
          title="Guidance not yet entered for this pathway"
        >
          <p>
            This branch exists in the source presentation, but its text has not
            been transcribed into the toolkit. Use the source summary directly
            and treat the notes below as scope, not as guidance.
          </p>
        </ClinicalAlert>
      ) : null}

      {resolvedDetails.length > 0 ? (
        <dl className="result__details">
          {resolvedDetails.map((d) => (
            <div key={d.label}>
              <dt>{d.label}</dt>
              <dd>{d.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {steps && steps.length > 0 ? (
        <section className="result__section result__section--steps">
          <h3>{stepsLabel}</h3>
          <ol className="protocol">
            {steps.map((step, index) => (
              <li key={step}>
                <span className="protocol__index" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="protocol__text">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {hasActions ? (
        <section className="result__section">
          <h3>Next clinical actions</h3>
          <ul className="list list--check">
            {guidance.actions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasConsiderations ? (
        <section className="result__section">
          <h3>Consider</h3>
          <ul className="list list--dot">
            {guidance.considerations?.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {guidance.escalation && guidance.escalation.length > 0 ? (
        <ClinicalAlert tone="escalation" title="Consider Higher Level of Care">
          <ul className="list list--dot">
            {guidance.escalation.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </ClinicalAlert>
      ) : null}

      {hasGaps ? (
        <section className="result__section result__section--gaps">
          <h3>Not covered by the current toolkit content</h3>
          <ul className="list list--dot">
            {guidance.gaps?.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {children}

      <footer className="result__footer">
        <SourceBadge
          source={guidance.source}
          review={guidance.review}
          contentVersion={guidance.contentVersion}
          showActions
        />
      </footer>
    </article>
  );
}
