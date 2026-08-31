import type { Verification } from '../../hooks/useVerifiedResult';

/**
 * States whether the result on screen was confirmed by the clinical API or
 * produced by this device's local copy of the rules.
 *
 * Both paths are the same logic — the parity test suite enforces that — so an
 * offline result is not a degraded result. The badge exists so the clinician
 * can see which one they got rather than having to assume.
 */
export function VerificationBadge({ verification }: { verification: Verification }) {
  const { state, detail } = verification;
  if (state === 'idle') return null;

  const copy: Record<string, { label: string; title: string }> = {
    checking: {
      label: 'Confirming with clinical API…',
      title: 'Asking the backend to confirm this result.',
    },
    verified: {
      label: 'Confirmed by clinical API',
      title: 'The backend independently returned this same result.',
    },
    offline: {
      label: 'Offline — local clinical rules',
      title:
        detail ??
        'The clinical API is unreachable. This result came from the copy of the rules built into this page.',
    },
    mismatch: {
      label: 'Result disagreement — do not rely on this',
      title: detail ?? 'The API and this device disagree.',
    },
  };

  const { label, title } = copy[state];

  return (
    <p
      className={`verification verification--${state} print-hide`}
      title={title}
      role={state === 'mismatch' ? 'alert' : 'status'}
    >
      <span className="verification__dot" aria-hidden="true" />
      {label}
      {state === 'mismatch' && detail ? (
        <span className="verification__detail">{detail}</span>
      ) : null}
    </p>
  );
}
