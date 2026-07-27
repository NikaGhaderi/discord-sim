/**
 * context — AuthProvider and the useAuth hook.
 *
 * Shares authentication state globally across the app (satisfies the
 * acceptance criterion "the React Context successfully shares the login
 * state globally across the application").
 *
 * Core state:
 *   - isAuthenticated: boolean
 *   - authStep: "LOGIN" | "2FA" | "AUTHENTICATED"
 *
 * Besides state, the login/verify/register/logout actions are exposed too so
 * the context is actually usable (not just a state holder). These actions
 * mirror the doc's state machine (Authenticating -> TwoFactorAuth -> LoggedIn)
 * on the client.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearTokens,
  hasAccessToken,
  setTokens,
} from "@infrastructure/tokenStorage";
import { identityApi } from "./index";
import {
  isTwoFactorRequired,
  type LoginPayload,
  type RegisterPayload,
} from "./types";

export type AuthStep = "LOGIN" | "2FA" | "AUTHENTICATED";

interface AuthContextValue {
  isAuthenticated: boolean;
  authStep: AuthStep;
  /** True while an auth network request is in flight (for disabling buttons, etc.). */
  isLoading: boolean;

  register: (payload: RegisterPayload) => Promise<void>;
  /** Login; if the backend requires 2FA, authStep moves to "2FA", otherwise to "AUTHENTICATED". */
  login: (payload: LoginPayload) => Promise<void>;
  /** Verify the 2FA code using the temp token stored from the login step. */
  verifyTwoFactor: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Request a password reset link. Resolves with the backend's message
   * (identical whether or not the email matches an account, per the
   * anti-enumeration rule) -- callers should just display it, never branch
   * on it. Doesn't touch authStep at all.
   */
  requestPasswordReset: (email: string) => Promise<string>;
  /** Confirm a password reset using the token from the emailed link. Resolves with a success message; rejects on an invalid/expired token or a weak password. */
  confirmPasswordReset: (token: string, newPassword: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authStep, setAuthStep] = useState<AuthStep>("LOGIN");
  const [isLoading, setIsLoading] = useState(false);

  /**
   * The temp token is kept only in memory (state), not localStorage, since
   * it's short-lived and sensitive; its lifetime is limited to the window
   * between login and verify2FA and shouldn't survive closing the tab.
   */
  const [tempToken, setTempToken] = useState<string | null>(null);

  const isAuthenticated = authStep === "AUTHENTICATED";

  /**
   * On initial load, restore the session if a token is already in storage so
   * refreshing the page doesn't log the user out. Note: the token itself
   * isn't validated here; if it's expired, the first protected request will
   * hit a 401.
   */
  useEffect(() => {
    if (hasAccessToken()) {
      setAuthStep("AUTHENTICATED");
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      // Registration returns final tokens directly (no 2FA step), so store
      // them and log the user in immediately.
      const res = await identityApi.registerUser(payload);
      setTokens({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      });
      setAuthStep("AUTHENTICATED");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const res = await identityApi.loginUser(payload);
      if (isTwoFactorRequired(res)) {
        setTempToken(res.temp_token);
        setAuthStep("2FA");
        return;
      }
      // Non-2FA path: tokens came back directly.
      setTokens({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      });
      setAuthStep("AUTHENTICATED");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyTwoFactor = useCallback(
    async (code: string) => {
      if (tempToken === null) {
        throw new Error(
          "verifyTwoFactor called without a temp token; login must run first.",
        );
      }
      setIsLoading(true);
      try {
        const res = await identityApi.verify2FA(code, tempToken);
        setTokens({
          access_token: res.access_token,
          refresh_token: res.refresh_token,
        });
        setTempToken(null);
        setAuthStep("AUTHENTICATED");
      } finally {
        setIsLoading(false);
      }
    },
    [tempToken],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      const res = await identityApi.requestPasswordReset(email);
      return res.message;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const confirmPasswordReset = useCallback(
    async (token: string, newPassword: string) => {
      setIsLoading(true);
      try {
        const res = await identityApi.confirmPasswordReset(token, newPassword);
        return res.message;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      // Real server-side logout (blacklists the refresh token). Even if the
      // network request fails, clear local tokens so the user is effectively
      // logged out.
      await identityApi.logoutUser().catch(() => undefined);
    } finally {
      clearTokens();
      setTempToken(null);
      setAuthStep("LOGIN");
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      authStep,
      isLoading,
      register,
      login,
      verifyTwoFactor,
      logout,
      requestPasswordReset,
      confirmPasswordReset,
    }),
    [
      isAuthenticated,
      authStep,
      isLoading,
      register,
      login,
      verifyTwoFactor,
      logout,
      requestPasswordReset,
      confirmPasswordReset,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Consumer hook. Throws outside AuthProvider so the mistake is caught early. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an <AuthProvider>.");
  }
  return ctx;
}
