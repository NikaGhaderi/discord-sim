import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../context';
import { AuthPage } from '../pages/AuthPage';
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

function renderAuthPage() {
  return render(
    <AuthProvider>
      <AuthPage />
    </AuthProvider>,
  );
}

async function fillAndSubmitLogin(username: string, password: string) {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: username } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /^login/i }));
}

describe('AuthPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  test('renders LoginForm by default', () => {
    renderAuthPage();
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  test('the "Register" link switches to RegisterForm', () => {
    renderAuthPage();

    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
  });

  test('a successful login calls loginUser and moves to the 2FA step', async () => {
    identityApi.loginUser.mockResolvedValue({
      status: '2FA_REQUIRED',
      temp_token: 'temp-token-1',
    });
    renderAuthPage();

    await fillAndSubmitLogin('nika@example.com', 'password123');

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /two-factor authentication/i }),
      ).toBeInTheDocument(),
    );
    expect(identityApi.loginUser).toHaveBeenCalledWith({
      username: 'nika@example.com',
      password: 'password123',
    });
  });

  test('a failed login shows an error and stays on the login step', async () => {
    identityApi.loginUser.mockRejectedValue(new Error('Unable to log in with the provided credentials.'));
    renderAuthPage();

    await fillAndSubmitLogin('nika@example.com', 'wrong-password');

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/unable to log in/i),
    );
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  test('a successful registration calls registerUser and goes straight to the authenticated view', async () => {
    identityApi.registerUser.mockResolvedValue({
      user_id: 1,
      username: 'nika',
      access_token: 'access-1',
      refresh_token: 'refresh-1',
    });
    renderAuthPage();

    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'nika' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'nika@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /you're logged in/i })).toBeInTheDocument(),
    );
    expect(identityApi.registerUser).toHaveBeenCalledWith({
      username: 'nika',
      email: 'nika@example.com',
      password: 'password123',
    });
  });

  test('a failed registration shows an error and stays on the register form', async () => {
    identityApi.registerUser.mockRejectedValue(new Error('A user with that username already exists.'));
    renderAuthPage();

    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'nika' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'nika@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i),
    );
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
  });

  test('a successful 2FA verification moves to the authenticated view', async () => {
    identityApi.loginUser.mockResolvedValue({
      status: '2FA_REQUIRED',
      temp_token: 'temp-token-1',
    });
    identityApi.verify2FA.mockResolvedValue({
      access_token: 'access-1',
      refresh_token: 'refresh-1',
    });
    renderAuthPage();

    await fillAndSubmitLogin('nika@example.com', 'password123');
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /two-factor authentication/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/verification code/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /you're logged in/i })).toBeInTheDocument(),
    );
    expect(identityApi.verify2FA).toHaveBeenCalledWith('123456', 'temp-token-1');
  });

  test('a failed 2FA verification shows an error and stays on the 2FA step', async () => {
    identityApi.loginUser.mockResolvedValue({
      status: '2FA_REQUIRED',
      temp_token: 'temp-token-1',
    });
    identityApi.verify2FA.mockRejectedValue(new Error('The 2FA code is invalid or expired.'));
    renderAuthPage();

    await fillAndSubmitLogin('nika@example.com', 'password123');
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /two-factor authentication/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/verification code/i), {
      target: { value: '000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid or expired/i),
    );
    expect(
      screen.getByRole('heading', { name: /two-factor authentication/i }),
    ).toBeInTheDocument();
  });

  test('logging out calls logoutUser and returns to the login step', async () => {
    identityApi.loginUser.mockResolvedValue({
      status: '2FA_REQUIRED',
      temp_token: 'temp-token-1',
    });
    identityApi.verify2FA.mockResolvedValue({
      access_token: 'access-1',
      refresh_token: 'refresh-1',
    });
    identityApi.logoutUser.mockResolvedValue({ message: 'Successfully logged out.' });
    renderAuthPage();

    await fillAndSubmitLogin('nika@example.com', 'password123');
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /two-factor authentication/i }),
      ).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText(/verification code/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /you're logged in/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument(),
    );
    expect(identityApi.logoutUser).toHaveBeenCalledTimes(1);
  });

  test('the "Forgot password?" link switches to ForgotPasswordForm', () => {
    renderAuthPage();

    fireEvent.click(screen.getByRole('button', { name: /forgot password\?/i }));

    expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument();
  });

  test('requesting a password reset calls requestPasswordReset and shows the backend message', async () => {
    identityApi.requestPasswordReset.mockResolvedValue({
      message: 'If an account exists, a reset link has been sent.',
    });
    renderAuthPage();

    fireEvent.click(screen.getByRole('button', { name: /forgot password\?/i }));
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'nika@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() =>
      expect(screen.getByText(/reset link has been sent/i)).toBeInTheDocument(),
    );
    expect(identityApi.requestPasswordReset).toHaveBeenCalledWith('nika@example.com');

    // Same message shown regardless of whether the account exists -- this
    // test only checks the UI displays whatever the backend/context
    // resolved with, never branches on it (that anti-enumeration behavior
    // itself is covered at the backend/context level).
    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });
});
