/**
 * apiClient — the central axios instance every network request goes through.
 *
 * Responsibilities:
 *  1. Build the axios instance with baseURL from an env var.
 *  2. Request interceptor: read access_token from local storage and attach an
 *     `Authorization: Bearer <token>` header to every outbound request.
 *
 * Current scope: no automatic token refresh yet; if the access token expires,
 * the request fails with a 401. See the note at the bottom of this file for
 * where that will be added.
 */

import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { getAccessToken } from "./tokenStorage";

// Base URL from env. In local dev, Nginx sits on port 80 and proxies requests
// to Django (internal port 8000), so the browser-reachable address is
// `http://localhost` (port 80), not 8000 directly. If unset, an empty string
// means relative paths (frontend served behind the same Nginx).
const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";

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

// ─────────────────────────────────────────────────────────────────────────────
// TECH DEBT: add a response interceptor that catches a 401, uses the
// refresh_token to get a fresh access_token, and retries the original
// request once. Kept centralized here so refresh applies to every request.
// ─────────────────────────────────────────────────────────────────────────────

export default apiClient;
