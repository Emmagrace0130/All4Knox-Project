import type { ReactNode } from 'react';

export type AlertTone = 'escalation' | 'warning' | 'info' | 'pending';

interface ClinicalAlertProps {
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
  /** Smaller, quieter note under the body — e.g. what is still unverified. */
  footnote?: string;
}

const icon: Record<AlertTone, string> = {
  escalation: '▲',
  warning: '▲',
  info: 'i',
  pending: '—',
};

/**
 * Visually prominent clinical messaging (skeleton §7 escalation banner, §21
 * high-risk situations).
 */
export function ClinicalAlert({
  tone = 'info',
  title,
  children,
  footnote,
}: ClinicalAlertProps) {
  return (
    <div className={`alert alert--${tone}`} role={tone === 'escalation' ? 'alert' : undefined}>
      <span className="alert__icon" aria-hidden="true">
        {icon[tone]}
      </span>
      <div className="alert__body">
        <p className="alert__title">{title}</p>
        {children ? <div className="alert__text">{children}</div> : null}
        {footnote ? <p className="alert__footnote">{footnote}</p> : null}
      </div>
    </div>
  );
}
