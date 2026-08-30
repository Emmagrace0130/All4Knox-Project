import { useState } from 'react';
import type { ReactNode } from 'react';

interface QuestionScreenProps {
  /** Big conversational question — the only heading on the screen. */
  question: string;
  /** Short supporting line under the question. */
  subtext?: string;
  children: ReactNode;
  /** "Why we ask" disclosure content. */
  help?: { label?: string; body: ReactNode };
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
}

/**
 * One question, one screen — the guided interview unit.
 *
 * Navigation stays at the bottom in a fixed order (Back left, Continue right)
 * so the provider's eye and cursor land in the same place on every screen.
 */
export function QuestionScreen({
  question,
  subtext,
  children,
  help,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
}: QuestionScreenProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <section className="screen">
      <h1 className="screen__question">{question}</h1>
      {subtext ? <p className="screen__subtext">{subtext}</p> : null}

      <div className="screen__body">{children}</div>

      {help ? (
        <div className="helpbox print-hide">
          <button
            type="button"
            className="helpbox__toggle"
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen((open) => !open)}
          >
            <span className="helpbox__icon" aria-hidden="true">
              ?
            </span>
            {help.label ?? 'Why we ask'}
            <span className="helpbox__chevron" aria-hidden="true">
              {helpOpen ? '▲' : '▼'}
            </span>
          </button>
          {helpOpen ? <div className="helpbox__body">{help.body}</div> : null}
        </div>
      ) : null}

      {onBack || onContinue ? (
        <div className="screen__nav print-hide">
          {onBack ? (
            <button type="button" className="btn btn--back" onClick={onBack}>
              <span aria-hidden="true">←</span> Back
            </button>
          ) : (
            <span />
          )}
          {onContinue ? (
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={onContinue}
              disabled={continueDisabled}
            >
              {continueLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
