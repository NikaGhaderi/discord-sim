import { describe, test, expect, vi, beforeEach } from 'vitest';
import apiClient from '@infrastructure/apiClient';
import { setTokens } from '@infrastructure/tokenStorage';
import {
  registerUser,
  loginUser,
  verify2FA,
  logoutUser,
  requestPasswordReset,
  confirmPasswordReset,
} from '../api';

vi.mock('@infrastructure/apiClient', () => ({
  default: { post: vi.fn() },
}));

const mockedPost = (apiClient as unknown as { post: ReturnType<typeof vi.fn> }).post;

describe('identity api (real)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  test('registerUser posts to /api/auth/register/', async () => {
    mockedPost.mockResolvedValue({
      data: { user_id: 1, username: 'nika', access_token: 'a', refresh_token: 'r' },
    });

    const result = await registerUser({
      username: 'nika',
      email: 'nika@example.com',
      password: 'password123',
    });

    expect(mockedPost).toHaveBeenCalledWith('/api/auth/register/', {
      username: 'nika',
      email: 'nika@example.com',
      password: 'password123',
    });
    expect(result.username).toBe('nika');
  });

  test('loginUser posts to /api/auth/login/', async () => {
    mockedPost.mockResolvedValue({
      data: { status: '2FA_REQUIRED', temp_token: 'temp-1' },
    });

    const result = await loginUser({ username: 'nika', password: 'password123' });

    expect(mockedPost).toHaveBeenCalledWith('/api/auth/login/', {
      username: 'nika',
      password: 'password123',
    });
    expect(result).toEqual({ status: '2FA_REQUIRED', temp_token: 'temp-1' });
  });

  test('verify2FA posts to the real backend path /api/auth/verify-2fa/, not /api/auth/2fa/verify/', async () => {
    mockedPost.mockResolvedValue({
      data: { access_token: 'a', refresh_token: 'r' },
    });

    await verify2FA('123456', 'temp-1');

    expect(mockedPost).toHaveBeenCalledWith('/api/auth/verify-2fa/', {
      code: '123456',
      temp_token: 'temp-1',
    });
  });

  test('logoutUser sends the stored refresh_token in the body', async () => {
    setTokens({ access_token: 'a', refresh_token: 'stored-refresh' });
    mockedPost.mockResolvedValue({ data: { message: 'Successfully logged out.' } });

    await logoutUser();

    expect(mockedPost).toHaveBeenCalledWith('/api/auth/logout/', {
      refresh_token: 'stored-refresh',
    });
  });

  test('requestPasswordReset posts { email } to /api/auth/password-reset/', async () => {
    mockedPost.mockResolvedValue({
      data: { message: 'If an account exists, a reset link has been sent.' },
    });

    const result = await requestPasswordReset('nika@example.com');

    expect(mockedPost).toHaveBeenCalledWith('/api/auth/password-reset/', {
      email: 'nika@example.com',
    });
    expect(result.message).toBe('If an account exists, a reset link has been sent.');
  });

  test('confirmPasswordReset posts { token, new_password } to /api/auth/password-reset/confirm/', async () => {
    mockedPost.mockResolvedValue({
      data: { message: 'Your password has been reset successfully.' },
    });

    await confirmPasswordReset('reset-token-123', 'NewPassw0rd!');

    expect(mockedPost).toHaveBeenCalledWith('/api/auth/password-reset/confirm/', {
      token: 'reset-token-123',
      new_password: 'NewPassw0rd!',
    });
  });
});
