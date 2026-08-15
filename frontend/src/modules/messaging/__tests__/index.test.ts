import { describe, it, expect, afterEach, vi } from 'vitest';

describe('Messaging module selector (index.ts)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('serves mockMessagingApi when VITE_USE_MOCK_API is "true"', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true');
    vi.resetModules();

    const { messagingApi } = await import('../index');
    const { mockMessagingApi } = await import('../mockApi');

    expect(messagingApi).toBe(mockMessagingApi);
  });

  it('serves the real messagingApi when VITE_USE_MOCK_API is not "true"', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false');
    vi.resetModules();

    const { messagingApi } = await import('../index');
    const realApi = await import('../api');

    expect(messagingApi).toBe(realApi.messagingApi);
  });
});
