import { createContext, useContext } from 'react';
import type { Identity, Role } from '../services/api';

/**
 * Context and hook for the current identity.
 *
 * Split out from the provider component so that file exports only a component
 * — React Fast Refresh only works when a module's exports are all components.
 */
export interface IdentityContextValue {
  identity: Identity | null;
  loading: boolean;
  role: Role;
  isAtLeast: (required: Role) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const ROLE_ORDER: Record<Role, number> = {
  visitor: 0,
  basic: 1,
  clinician: 2,
  admin: 3,
};

export const IdentityContext = createContext<IdentityContextValue | null>(null);

export function useIdentity(): IdentityContextValue {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error('useIdentity must be used inside <IdentityProvider>');
  return ctx;
}
