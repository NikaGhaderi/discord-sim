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
  LoginPayload,
  LoginResponse,
  LogoutResponse,
  RegisterPayload,
  RegisterResponse,
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
