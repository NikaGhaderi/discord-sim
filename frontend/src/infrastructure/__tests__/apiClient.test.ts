import { describe, test, expect, afterEach, vi } from 'vitest';
import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import apiClient, { resolveMediaUrl, SESSION_EXPIRED_EVENT } from '../apiClient';
import { clearTokens, getAccessToken, setTokens } from '../tokenStorage';

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

describe('resolveMediaUrl', () => {
  test('prefixes a root-relative backend path with the API base URL', () => {
    expect(resolveMediaUrl('/media/message_media/x.png')).toBe(
      'http://localhost/media/message_media/x.png'
    );
  });

  test('leaves an already-absolute URL untouched', () => {
    expect(resolveMediaUrl('https://cdn.example.com/x.png')).toBe(
      'https://cdn.example.com/x.png'
    );
  });
});

/** Builds a 401 AxiosError as axios itself would produce for a given config. */
function unauthorizedError(config: InternalAxiosRequestConfig): AxiosError {
  return new AxiosError(
    'Unauthorized',
    'ERR_BAD_REQUEST',
    config,
    {},
    { status: 401, statusText: 'Unauthorized', headers: {}, config, data: null }
  );
}

describe('apiClient response interceptor (token refresh)', () => {
  afterEach(() => {
    clearTokens();
    vi.restoreAllMocks();
  });

  test('on a 401, refreshes the access token and retries the original request once', async () => {
    setTokens({ access_token: 'old-token', refresh_token: 'refresh-token' });
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { access_token: 'new-token' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    });

    let callCount = 0;
    const response = await apiClient.get('/probe', {
      adapter: (config) => {
        callCount += 1;
        if (callCount === 1) {
          return Promise.reject(unauthorizedError(config as InternalAxiosRequestConfig));
        }
        return Promise.resolve({
          data: { ok: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config as InternalAxiosRequestConfig,
        });
      },
    });

    expect(callCount).toBe(2);
    expect(response.data).toEqual({ ok: true });
    expect(getAccessToken()).toBe('new-token');
    expect((response.config.headers as AxiosHeaders).get('Authorization')).toBe(
      'Bearer new-token'
    );
  });

  test('shares a single in-flight refresh call across concurrent 401s', async () => {
    setTokens({ access_token: 'old-token', refresh_token: 'refresh-token' });
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { access_token: 'new-token' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    });

    const makeRequest = () => {
      let callCount = 0;
      return apiClient.get('/probe', {
        adapter: (config) => {
          callCount += 1;
          if (callCount === 1) {
            return Promise.reject(unauthorizedError(config as InternalAxiosRequestConfig));
          }
          return Promise.resolve({
            data: { ok: true },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: config as InternalAxiosRequestConfig,
          });
        },
      });
    };

    await Promise.all([makeRequest(), makeRequest()]);

    expect(postSpy).toHaveBeenCalledTimes(1);
  });

  test('clears tokens and dispatches session-expired when the refresh itself fails', async () => {
    setTokens({ access_token: 'old-token', refresh_token: 'stale-refresh' });
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh token invalid'));
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    try {
      await expect(
        apiClient.get('/probe', {
          adapter: (config) =>
            Promise.reject(unauthorizedError(config as InternalAxiosRequestConfig)),
        })
      ).rejects.toThrow();

      expect(getAccessToken()).toBeNull();
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
    }
  });

  test('clears tokens immediately on a 401 when there is no refresh token stored', async () => {
    setTokens({ access_token: 'old-token', refresh_token: 'refresh-token' });
    clearTokens();
    const postSpy = vi.spyOn(axios, 'post');

    await expect(
      apiClient.get('/probe', {
        adapter: (config) =>
          Promise.reject(unauthorizedError(config as InternalAxiosRequestConfig)),
      })
    ).rejects.toThrow();

    expect(postSpy).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  test('gives up after one retry if the retried request is still unauthorized', async () => {
    setTokens({ access_token: 'old-token', refresh_token: 'refresh-token' });
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { access_token: 'new-token' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    });

    let callCount = 0;
    await expect(
      apiClient.get('/probe', {
        adapter: (config) => {
          callCount += 1;
          return Promise.reject(unauthorizedError(config as InternalAxiosRequestConfig));
        },
      })
    ).rejects.toThrow();

    expect(callCount).toBe(2);
  });

  test('passes through non-401 errors without attempting a refresh', async () => {
    const postSpy = vi.spyOn(axios, 'post');

    await expect(
      apiClient.get('/probe', {
        adapter: (config) => {
          const serverError = new AxiosError(
            'Server Error',
            'ERR_BAD_RESPONSE',
            config as InternalAxiosRequestConfig,
            {},
            {
              status: 500,
              statusText: 'Server Error',
              headers: {},
              config: config as InternalAxiosRequestConfig,
              data: null,
            }
          );
          return Promise.reject(serverError);
        },
      })
    ).rejects.toThrow();

    expect(postSpy).not.toHaveBeenCalled();
  });
});
