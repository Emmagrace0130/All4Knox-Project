interface ProgressBarProps {
  /** 1-based index of the current screen. */
  current: number;
  /** Total screens including the result screen. */
  total: number;
  label?: string;
}

/** Thin progress bar pinned under the header during a guided flow. */
export function ProgressBar({ current, total, label }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((current / total) * 100));

  return (
    <div className="progress print-hide">
      <div
        className="progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label={label ?? 'Progress'}
      >
        <div className="progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="progress__label">
        {label ? <span className="progress__name">{label}</span> : null}
        <span>
          Step {current} of {total}
        </span>
      </p>
    </div>
  );
}
