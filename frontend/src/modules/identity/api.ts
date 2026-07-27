/**
 * api — the real implementation of the identity functions, talking to the
 * Django backend. Every request goes through apiClient so the Authorization
 * header is attached automatically.
 *
 * Endpoint source: backend/apps/authentication/api/urls.py.
 */

import apiClient from "@infrastructure/apiClient";
import { getRefreshToken } from "@infrastructure/tokenStorage";
import type {
  ConfirmPasswordResetResponse,
  LoginPayload,
  LoginResponse,
  LogoutResponse,
  RegisterPayload,
  RegisterResponse,
  RequestPasswordResetResponse,
  Verify2FAResponse,
} from "./types";

/** Identity API paths (backend/apps/authentication/api/urls.py). */
const ENDPOINTS = {
  register: "/api/auth/register/",
  login: "/api/auth/login/",
  logout: "/api/auth/logout/",
  verify2FA: "/api/auth/verify-2fa/",
  passwordReset: "/api/auth/password-reset/",
  passwordResetConfirm: "/api/auth/password-reset/confirm/",
} as const;

/** Register a new user. */
export const registerUser = async (
  payload: RegisterPayload,
): Promise<RegisterResponse> => {
  const { data } = await apiClient.post<RegisterResponse>(
    ENDPOINTS.register,
    payload,
  );
  return data;
};

/**
 * Log in. Since 2FA is mandatory, the response is always the "2FA required"
 * shape and includes a temp_token; final tokens are issued at the verify2FA
 * step. Deciding what happens next is the AuthProvider's job.
 */
export const loginUser = async (
  payload: LoginPayload,
): Promise<LoginResponse> => {
  const { data } = await apiClient.post<LoginResponse>(
    ENDPOINTS.login,
    payload,
  );
  return data;
};

/**
 * Verify the 2FA code. `code` is what the user typed and `tempToken` is the
 * temp token from loginUser's response. On success, the final access tokens
 * are returned.
 */
export const verify2FA = async (
  code: string,
  tempToken: string,
): Promise<Verify2FAResponse> => {
  const { data } = await apiClient.post<Verify2FAResponse>(ENDPOINTS.verify2FA, {
    code,
    temp_token: tempToken,
  });
  return data;
};

/**
 * Log out. Per the doc, refresh_token is sent in the body so the server can
 * blacklist it (a real invalidation, not just a client-side clear).
 */
export const logoutUser = async (): Promise<LogoutResponse> => {
  const refreshToken = getRefreshToken();
  const { data } = await apiClient.post<LogoutResponse>(ENDPOINTS.logout, {
    refresh_token: refreshToken,
  });
  return data;
};

/**
 * Request a password reset link. Per the doc's anti-enumeration business
 * rule, the backend returns this exact response whether or not the email
 * matches an account -- never branch UI behavior on it, just display it.
 */
export const requestPasswordReset = async (
  email: string,
): Promise<RequestPasswordResetResponse> => {
  const { data } = await apiClient.post<RequestPasswordResetResponse>(
    ENDPOINTS.passwordReset,
    { email },
  );
  return data;
};

/**
 * Confirm a password reset using the token from the emailed link. Not part
 * of the doc's documented API contract (only the request step is
 * documented) -- matches the backend's ConfirmPasswordResetView.
 */
export const confirmPasswordReset = async (
  token: string,
  newPassword: string,
): Promise<ConfirmPasswordResetResponse> => {
  const { data } = await apiClient.post<ConfirmPasswordResetResponse>(
    ENDPOINTS.passwordResetConfirm,
    { token, new_password: newPassword },
  );
  return data;
};
