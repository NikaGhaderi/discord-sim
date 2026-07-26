/**
 * types — data contracts for the identity module (payloads and responses).
 *
 * Source: the Phase 1 requirements doc's Identity & Profile Management API
 * section. This module is the single source of truth for auth types.
 */

// ── Payloads (request inputs) ────────────────────────────────────────────────

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  /** Accepts either username or email per the doc; the backend figures out which. Field name in the request body is `username`. */
  username: string;
  password: string;
}

// ── Responses ─────────────────────────────────────────────────────────────────

/** The standard token pair the backend returns after a successful authentication. */
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

/** Successful registration response (201 Created). */
export interface RegisterResponse extends AuthTokens {
  user_id: number;
  username: string;
}

/**
 * Login response.
 *
 * Since 2FA is mandatory, Login always returns the "2FA required" shape
 * (`{ status: "2FA_REQUIRED", temp_token }`) rather than final tokens; tokens
 * are issued at the verify2FA step. The union below (including a direct-token
 * shape) is kept deliberately so the client doesn't need a structural change
 * if 2FA is ever made optional for some users.
 */
export type LoginResponse = AuthTokens | TwoFactorRequiredResponse;

export interface TwoFactorRequiredResponse {
  status: "2FA_REQUIRED";
  /** Short-lived temp token sent along with the code at the verify2FA step. */
  temp_token: string;
}

/** 2FA verification response — final tokens on success. */
export type Verify2FAResponse = AuthTokens;

/** Logout response. */
export interface LogoutResponse {
  message: string;
}

// ── Type guards ────────────────────────────────────────────────────────────────

/** Distinguishes a "2FA required" login response from a direct-token one. */
export const isTwoFactorRequired = (
  res: LoginResponse,
): res is TwoFactorRequiredResponse => {
  return (res as TwoFactorRequiredResponse).status === "2FA_REQUIRED";
};

// ── Shared contract for both implementations (real and mock) ──────────────────

export interface IdentityApi {
  registerUser(payload: RegisterPayload): Promise<RegisterResponse>;
  loginUser(payload: LoginPayload): Promise<LoginResponse>;
  verify2FA(code: string, tempToken: string): Promise<Verify2FAResponse>;
  logoutUser(): Promise<LogoutResponse>;
}
