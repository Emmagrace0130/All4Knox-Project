import type { ReactNode } from 'react';

interface ResultScreenProps {
  /** Conversational confirmation, e.g. "Here's your prescribing pathway". */
  heading: string;
  subtext?: string;
  /** The provider's answers, echoed back as editable chips. */
  answers?: { label: string; onEdit?: () => void }[];
  children: ReactNode;
  /** Footer actions — start over, jump to a related tool. */
  actions?: ReactNode;
  tone?: 'success' | 'neutral';
}

/**
 * The end of a guided flow: a confirmation header, the answers that produced
 * it, then the guidance itself.
 */
export function ResultScreen({
  heading,
  subtext,
  answers,
  children,
  actions,
  tone = 'success',
}: ResultScreenProps) {
  return (
    <section className="resultscreen">
      <header className={`resultscreen__header resultscreen__header--${tone}`}>
        <span className="resultscreen__badge" aria-hidden="true">
          {tone === 'success' ? '✓' : 'i'}
        </span>
        <div>
          <h1 className="resultscreen__heading">{heading}</h1>
          {subtext ? <p className="resultscreen__subtext">{subtext}</p> : null}
        </div>
      </header>

      {answers && answers.length > 0 ? (
        <ul className="answers">
          {answers.map((answer) => (
            <li key={answer.label} className="answers__item">
              <span>{answer.label}</span>
              {answer.onEdit ? (
                <button
                  type="button"
                  className="answers__edit print-hide"
                  onClick={answer.onEdit}
                >
                  Edit
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {children}

      {actions ? <div className="resultscreen__actions print-hide">{actions}</div> : null}
    </section>
  );
}
