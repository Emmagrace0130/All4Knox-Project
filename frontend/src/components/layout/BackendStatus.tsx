import { useBackendStatus } from '../../hooks/useBackendStatus';

/**
 * Footer indicator: is clinical content being served by the API, or by the
 * copy built into this page?
 *
 * Shown because the toolkit works either way. A clinician should be able to
 * tell which one they are looking at without having to open devtools.
 */
export function BackendStatus() {
  const { state, health } = useBackendStatus();

  if (state === 'checking') return null;

  if (state === 'offline') {
    return (
      <span
        className="backend-status backend-status--offline"
        title="The clinical API is unreachable. Guidance is coming from the copy of the rules built into this page — the same rules, held identical by the backend parity tests."
      >
        <span className="backend-status__dot" aria-hidden="true" />
        Offline — local clinical rules
      </span>
    );
  }

  return (
    <span
      className="backend-status backend-status--online"
      title={`Clinical API reachable. Content version ${health?.contentVersion ?? 'unknown'}.`}
    >
      <span className="backend-status__dot" aria-hidden="true" />
      Clinical API connected
      {health?.assistantEnabled ? ' · assistant available' : ''}
    </span>
  );
}
