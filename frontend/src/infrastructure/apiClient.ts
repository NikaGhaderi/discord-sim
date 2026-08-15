/**
 * apiClient — the central axios instance every network request goes through.
 *
 * Responsibilities:
 *  1. Build the axios instance with baseURL from an env var.
 *  2. Request interceptor: read access_token from local storage and attach an
 *     `Authorization: Bearer <token>` header to every outbound request.
 *  3. Response interceptor: on a 401 (expired access token), use the
 *     refresh_token to get a fresh one and retry the original request once.
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from "./tokenStorage";

// Base URL from env. In local dev, Nginx sits on port 80 and proxies requests
// to Django (internal port 8000), so the browser-reachable address is
// `http://localhost` (port 80), not 8000 directly. If unset, an empty string
// means relative paths (frontend served behind the same Nginx).
export const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Resolves a backend-relative URL (e.g. a media file's `/media/...` path)
 * against the API's origin rather than the current page's. In production
 * the frontend and backend share an origin behind Nginx, so a root-relative
 * URL like `/media/x.png` resolves correctly on its own -- but in local dev
 * the Vite dev server runs on its own port, so an unresolved root-relative
 * URL would 404/blank-page against the wrong origin.
 */
export const resolveMediaUrl = (url: string): string => {
  if (/^https?:\/\//i.test(url)) return url;
  return `${baseURL}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  // A sane timeout so requests don't hang indefinitely.
  timeout: 15_000,
});

/**
 * Request interceptor — automatically attaches the access token to every
 * request. This satisfies the acceptance criterion "Tokens are automatically
 * appended to all outbound requests."
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getAccessToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const REFRESH_PATH = "/api/auth/refresh/";

/** Dispatched when the refresh_token itself is invalid/expired, so the
 *  identity module can drop the user back to the login screen without this
 *  infrastructure module depending on React state. */
export const SESSION_EXPIRED_EVENT = "auth:session-expired";

// Concurrent 401s share one in-flight refresh call instead of each firing
// their own -- a page that fires several requests at once with a stale
// token would otherwise exchange the same refresh_token multiple times.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available.");
  }
  // Plain axios, not apiClient -- this call must never carry a stale
  // Authorization header or route back through this same interceptor.
  const { data } = await axios.post<{ access_token: string }>(
    `${baseURL}${REFRESH_PATH}`,
    { refresh_token: refreshToken },
  );
  setAccessToken(data.access_token);
  return data.access_token;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newAccessToken = await refreshPromise;
      originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
      return apiClient(originalRequest);
    } catch {
      clearTokens();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      return Promise.reject(error);
    }
  },
);

export default apiClient;
