import { describe, test, expect, beforeEach } from 'vitest';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  hasAccessToken,
  setTokens,
} from '../tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('has no tokens by default', () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(hasAccessToken()).toBe(false);
  });

  test('setTokens stores both tokens, readable via the getters', () => {
    setTokens({ access_token: 'access-1', refresh_token: 'refresh-1' });

    expect(getAccessToken()).toBe('access-1');
    expect(getRefreshToken()).toBe('refresh-1');
    expect(hasAccessToken()).toBe(true);
  });

  test('clearTokens removes both tokens', () => {
    setTokens({ access_token: 'access-1', refresh_token: 'refresh-1' });
    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(hasAccessToken()).toBe(false);
  });
});
