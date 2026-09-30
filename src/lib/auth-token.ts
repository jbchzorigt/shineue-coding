import type { UserRole } from "@/lib/types";

/** The user-row fields that decide whether a session is still valid. */
export interface AuthState {
  role: UserRole;
  must_change_password: boolean;
  session_version: number;
}

export interface SessionToken {
  sub?: string;
  /** session_version the token was issued against. */
  sv?: number;
  role?: UserRole;
  mustChangePassword?: boolean;
}

/**
 * Re-validates a session against its user row on every request. A missing
 * row (deleted account) or a bumped session_version (password changed or
 * reset) ends the session; otherwise the role and must-change flag are
 * refreshed from the database, so role changes apply immediately.
 */
export function refreshToken<T extends SessionToken>(token: T, state: AuthState | null): T | null {
  if (!state) return null;
  if ((token.sv ?? 0) !== state.session_version) return null;
  return { ...token, role: state.role, mustChangePassword: state.must_change_password };
}
