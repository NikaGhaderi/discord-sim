import { useState } from 'react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context';
import { SESSION_EXPIRED_EVENT } from '@infrastructure/apiClient';
import * as identityModule from '../index';

vi.mock('../index', () => ({
  identityApi: {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    verify2FA: vi.fn(),
    logoutUser: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
  },
}));

const identityApi = identityModule.identityApi as {
  registerUser: ReturnType<typeof vi.fn>;
  loginUser: ReturnType<typeof vi.fn>;
  verify2FA: ReturnType<typeof vi.fn>;
  logoutUser: ReturnType<typeof vi.fn>;
  requestPasswordReset: ReturnType<typeof vi.fn>;
  confirmPasswordReset: ReturnType<typeof vi.fn>;
};

function Probe() {
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div>
      <span data-testid="step">{auth.authStep}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="error">{error ?? ''}</span>
      <span data-testid="message">{message ?? ''}</span>
      <button onClick={() => auth.login({ username: 'nika', password: 'password123' })}>
        login
      </button>
      <button
        onClick={() =>
          auth.verifyTwoFactor('123456').catch((err: Error) => setError(err.message))
        }
      >
        verify
      </button>
      <button onClick={() => auth.logout()}>logout</button>
      <button
        onClick={() =>
          auth.requestPasswordReset('nika@example.com').then(setMessage)
        }
      >
        request-reset
      </button>
      <button
        onClick={() =>
          auth
            .confirmPasswordReset('reset-token-1', 'NewPassw0rd!')
            .then(setMessage)
            .catch((err: Error) => setError(err.message))
        }
      >
        confirm-reset
      </button>
    </div>
  );
}

describe('AuthProvider / useAuth', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  test('starts on the LOGIN step when no token is stored', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId('step')).toHaveTextContent('LOGIN');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  test('restores an AUTHENTICATED session if an access token already exists', () => {
    window.localStorage.setItem('access_token', 'existing-token');

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId('step')).toHaveTextContent('AUTHENTICATED');
  });

  test('drops back to LOGIN when apiClient reports the session has expired', async () => {
    window.localStorage.setItem('access_token', 'existing-token');
    window.localStorage.setItem('refresh_token', 'existing-refresh');

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('step')).toHaveTextContent('AUTHENTICATED');

    await act(async () => {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    });

    expect(screen.getByTestId('step')).toHaveTextContent('LOGIN');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  test('login moves to the 2FA step when the backend requires it', async () => {
    identityApi.loginUser.mockResolvedValue({
      status: '2FA_REQUIRED',
      temp_token: 'temp-token-1',
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => {
      screen.getByText('login').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('step')).toHaveTextContent('2FA'),
    );
  });

  test('verifyTwoFactor stores tokens and moves to AUTHENTICATED', async () => {
    identityApi.loginUser.mockResolvedValue({
      status: '2FA_REQUIRED',
      temp_token: 'temp-token-1',
    });
    identityApi.verify2FA.mockResolvedValue({
      access_token: 'final-access',
      refresh_token: 'final-refresh',
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => {
      screen.getByText('login').click();
    });
    await waitFor(() =>
      expect(screen.getByTestId('step')).toHaveTextContent('2FA'),
    );

    await act(async () => {
      screen.getByText('verify').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('step')).toHaveTextContent('AUTHENTICATED'),
    );
    expect(identityApi.verify2FA).toHaveBeenCalledWith('123456', 'temp-token-1');
    expect(window.localStorage.getItem('access_token')).toBe('final-access');
  });

  test('verifyTwoFactor without a prior login rejects instead of silently no-op-ing', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => {
      screen.getByText('verify').click();
    });

    expect(screen.getByTestId('error')).toHaveTextContent(/temp token/i);
    expect(screen.getByTestId('step')).toHaveTextContent('LOGIN');
  });

  test('logout clears tokens and returns to LOGIN even if the network call fails', async () => {
    window.localStorage.setItem('access_token', 'existing-token');
    window.localStorage.setItem('refresh_token', 'existing-refresh');
    identityApi.logoutUser.mockRejectedValue(new Error('network down'));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId('step')).toHaveTextContent('AUTHENTICATED');

    await act(async () => {
      screen.getByText('logout').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('step')).toHaveTextContent('LOGIN'),
    );
    expect(window.localStorage.getItem('access_token')).toBeNull();
  });

  test('requestPasswordReset resolves with the backend message and does not touch authStep', async () => {
    identityApi.requestPasswordReset.mockResolvedValue({
      message: 'If an account exists, a reset link has been sent.',
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => {
      screen.getByText('request-reset').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('message')).toHaveTextContent(/reset link has been sent/i),
    );
    expect(identityApi.requestPasswordReset).toHaveBeenCalledWith('nika@example.com');
    expect(screen.getByTestId('step')).toHaveTextContent('LOGIN');
  });

  test('confirmPasswordReset resolves with the backend message on success', async () => {
    identityApi.confirmPasswordReset.mockResolvedValue({
      message: 'Your password has been reset successfully.',
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => {
      screen.getByText('confirm-reset').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('message')).toHaveTextContent(/reset successfully/i),
    );
    expect(identityApi.confirmPasswordReset).toHaveBeenCalledWith(
      'reset-token-1',
      'NewPassw0rd!',
    );
  });

  test('confirmPasswordReset surfaces an error on an invalid/expired token', async () => {
    identityApi.confirmPasswordReset.mockRejectedValue(
      new Error('This password reset link is invalid or has expired.'),
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => {
      screen.getByText('confirm-reset').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('error')).toHaveTextContent(/invalid or has expired/i),
    );
  });
});
