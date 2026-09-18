import { useEffect, useState } from 'react';
import { ApiError } from '../services/api';

export type VerificationState =
  | 'idle'
  | 'checking'
  | 'verified'
  | 'offline'
  | 'mismatch';

export interface Verification {
  state: VerificationState;
  detail: string | null;
}

/**
 * Local-first evaluation with backend verification.
 *
 * The decision tools compute their answer locally and render it instantly —
 * a clinician mid-visit should never wait on a network round-trip for a rule
 * that is pure logic. In parallel we ask the API the same question and compare
 * the identifier it returns.
 *
 * `mismatch` should be unreachable: backend/tests/test_parity.py replays the
 * entire input space of every tool through both implementations and requires
 * identical answers. If it ever does appear on screen, the deployed frontend
 * and backend are running different content versions, and that is exactly the
 * silent drift skeleton §21 forbids — so it is surfaced loudly rather than
 * swallowed.
 *
 * @param localId  identifier of the locally computed result (null when the
 *                 tool has no answer yet)
 * @param fetchRemoteId  asks the API the same question; resolves to its
 *                 identifier, or null when the API also has no answer
 * @param enabled  false while the form is incomplete
 */
export function useVerifiedResult(
  localId: string | null,
  fetchRemoteId: () => Promise<string | null>,
  enabled: boolean,
): Verification {
  const [state, setState] = useState<VerificationState>('idle');
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState('idle');
      setDetail(null);
      return;
    }

    let cancelled = false;
    setState('checking');
    setDetail(null);

    fetchRemoteId()
      .then((remoteId) => {
        if (cancelled) return;
        if (remoteId === localId) {
          setState('verified');
          return;
        }
        setState('mismatch');
        setDetail(
          `The API returned "${remoteId ?? 'no result'}" where this device ` +
            `computed "${localId ?? 'no result'}". Do not rely on this result; ` +
            `report it before continuing.`,
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState('offline');
        setDetail(
          error instanceof ApiError
            ? error.message
            : 'the clinical API could not be reached',
        );
      });

    return () => {
      cancelled = true;
    };
    // fetchRemoteId is recreated per render by callers; localId+enabled are the
    // real inputs, so the lint rule is deliberately not followed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localId, enabled]);

  return { state, detail };
}
