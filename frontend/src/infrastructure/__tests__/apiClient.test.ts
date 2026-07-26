import { describe, test, expect, afterEach } from 'vitest';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import apiClient from '../apiClient';
import { clearTokens, setTokens } from '../tokenStorage';

/** Captures the fully-resolved request config (post-interceptors) without making a real network call. */
async function captureRequestConfig(): Promise<InternalAxiosRequestConfig> {
  let captured: InternalAxiosRequestConfig | undefined;
  await apiClient.get('/probe', {
    adapter: (config) => {
      captured = config as InternalAxiosRequestConfig;
      return Promise.resolve({
        data: null,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });
    },
  });
  if (!captured) {
    throw new Error('adapter was never invoked');
  }
  return captured;
}

describe('apiClient', () => {
  afterEach(() => {
    clearTokens();
  });

  test('attaches no Authorization header when there is no access token', async () => {
    const config = await captureRequestConfig();
    const headers = config.headers as AxiosHeaders;

    expect(headers.get('Authorization')).toBeFalsy();
  });

  test('attaches a Bearer Authorization header when an access token exists', async () => {
    setTokens({ access_token: 'token-123', refresh_token: 'refresh-123' });

    const config = await captureRequestConfig();
    const headers = config.headers as AxiosHeaders;

    expect(headers.get('Authorization')).toBe('Bearer token-123');
  });
});
