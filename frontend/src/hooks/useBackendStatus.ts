import { useEffect, useState } from 'react';
import { getHealth } from '../services/api';
import type { HealthResponse } from '../services/api';

export type BackendState = 'checking' | 'online' | 'offline';

export interface BackendStatus {
  state: BackendState;
  health: HealthResponse | null;
}

/**
 * Polls the API so the UI can say honestly whether guidance is being served by
 * the backend or by the frontend's local fallback copy.
 *
 * The toolkit deliberately keeps working while the API is down (the rule
 * engines exist on both sides and are held identical by the parity test suite),
 * so this is about telling the truth on screen — not about gating features.
 */
export function useBackendStatus(pollMs = 30000): BackendStatus {
  const [state, setState] = useState<BackendState>('checking');
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const result = await getHealth();
        if (cancelled) return;
        setHealth(result);
        setState('online');
      } catch {
        if (cancelled) return;
        setState('offline');
      }
    };

    check();
    const timer = setInterval(check, pollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pollMs]);

  return { state, health };
}
