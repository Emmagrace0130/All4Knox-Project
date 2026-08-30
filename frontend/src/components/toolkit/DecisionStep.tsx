import type { ReactNode } from 'react';

interface DecisionStepProps {
  step: number;
  title: string;
  hint?: string;
  children: ReactNode;
  /** Dim steps that are not yet reachable. */
  disabled?: boolean;
}

export function DecisionStep({
  step,
  title,
  hint,
  children,
  disabled = false,
}: DecisionStepProps) {
  return (
    <section
      className={['step', disabled ? 'step--disabled' : ''].filter(Boolean).join(' ')}
      aria-disabled={disabled || undefined}
    >
      <header className="step__header">
        <span className="step__number" aria-hidden="true">
          {step}
        </span>
        <div>
          <h2 className="step__title">{title}</h2>
          {hint ? <p className="step__hint">{hint}</p> : null}
        </div>
      </header>
      <div className="step__body">{children}</div>
    </section>
  );
}
