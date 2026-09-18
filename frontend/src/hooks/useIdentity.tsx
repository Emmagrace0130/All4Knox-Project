import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as api from '../services/api';
import type { Identity } from '../services/api';
import { IdentityContext, ROLE_ORDER } from './identityContext';
import type { IdentityContextValue } from './identityContext';

/**
 * Establishes who is using the app right now.
 *
 * Everyone has an identity — an anonymous caller is a `visitor`, not an error
 * state. Nothing about the deterministic clinical tools is gated on this; roles
 * only unlock configuration and document management.
 *
 * This provider is also what establishes the session cookie. Pages that create
 * server-side state (the assistant's conversation) must wait for `loading` to
 * be false before calling the API — otherwise their request arrives without a
 * cookie and mints a second, competing session.
 */
export function IdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setIdentity(await api.getIdentity());
    } catch {
      // The API being unreachable must not break the toolkit — the clinical
      // tools work offline. Fall back to a local visitor identity.
      setIdentity({
        sessionId: 'offline',
        role: 'visitor',
        user: null,
        isAuthenticated: false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Synchronising with an external system (the API) on mount is exactly what
    // an effect is for; `refresh` is async, so no state is set synchronously.
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await api.login(email, password);
      await refresh();
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      await refresh();
    }
  }, [refresh]);

  const role = identity?.role ?? 'visitor';

  const value = useMemo<IdentityContextValue>(
    () => ({
      identity,
      loading,
      role,
      isAtLeast: (required) => ROLE_ORDER[role] >= ROLE_ORDER[required],
      signIn,
      signOut,
      refresh,
    }),
    [identity, loading, role, signIn, signOut, refresh],
  );

  return (
    <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
  );
}
