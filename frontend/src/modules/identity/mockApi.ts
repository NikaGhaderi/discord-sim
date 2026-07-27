/**
 * mockApi — dummy versions of the identity functions.
 *
 * Purpose: develop the frontend UI without needing a live Django server. Set
 * VITE_USE_MOCK_API=true to use this instead of api.ts.
 *
 * Each function's output shape exactly matches the real contract so the
 * whole Login → 2FA → Authenticated flow can be exercised without a backend:
 *   registerUser → { user_id, username, access_token, refresh_token }
 *   loginUser    → { status: "2FA_REQUIRED", temp_token }   (2FA is mandatory)
 *   verify2FA    → { access_token, refresh_token }
 *   logoutUser   → { message: "Successfully logged out." }
 */

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

/** Dummy tokens standing in for a successful response. */
const MOCK_TOKENS = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
} as const;

const MOCK_TEMP_TOKEN = "mock-temp-token";

export const registerUser = async (
  payload: RegisterPayload,
): Promise<RegisterResponse> => {
  return Promise.resolve({
    user_id: 1,
    username: payload.username,
    ...MOCK_TOKENS,
  });
};

/** Login always routes to the 2FA step (2FA is mandatory). */
export const loginUser = async (
  _payload: LoginPayload,
): Promise<LoginResponse> => {
  return Promise.resolve({
    status: "2FA_REQUIRED",
    temp_token: MOCK_TEMP_TOKEN,
  });
};

export const verify2FA = async (
  _code: string,
  _tempToken: string,
): Promise<Verify2FAResponse> => {
  return Promise.resolve({ ...MOCK_TOKENS });
};

export const logoutUser = async (): Promise<LogoutResponse> => {
  return Promise.resolve({ message: "Successfully logged out." });
};

export const requestPasswordReset = async (
  _email: string,
): Promise<RequestPasswordResetResponse> => {
  return Promise.resolve({
    message: "If an account exists, a reset link has been sent.",
  });
};

export const confirmPasswordReset = async (
  _token: string,
  _newPassword: string,
): Promise<ConfirmPasswordResetResponse> => {
  return Promise.resolve({
    message: "Your password has been reset successfully.",
  });
};
