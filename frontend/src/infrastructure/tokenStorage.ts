/**
 * tokenStorage — the single centralized point of access to client-side JWTs.
 *
 * Why centralized? Tokens are kept in localStorage in this version.
 * Centralizing every access in this one module means a future change to the
 * storage mechanism (e.g. migrating to an HttpOnly cookie, which is safer
 * against XSS and needs backend cooperation) only touches this file, not
 * every call site across the codebase.
 */

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export const getAccessToken = (): string | null => {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setTokens = ({ access_token, refresh_token }: TokenPair): void => {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
};

/**
 * Updates only the access token, leaving the refresh token untouched. Used
 * after a refresh-token exchange, since TokenRefreshView only issues a new
 * access token (refresh tokens aren't rotated server-side).
 */
export const setAccessToken = (accessToken: string): void => {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
};

export const clearTokens = (): void => {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const hasAccessToken = (): boolean => getAccessToken() !== null;
