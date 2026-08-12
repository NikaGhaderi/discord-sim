import { describe, it, expect, afterEach, vi } from 'vitest';

describe('Notifications module selector (index.ts)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('serves mock notificationsApi and a MockSocketClient when VITE_USE_MOCK_API is "true"', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true');
    vi.resetModules();

    const { notificationsApi, socketClient } = await import('../index');
    const mockApi = await import('../mockApi');
    const { MockSocketClient } = await import('@infrastructure/mockSocketClient');

    expect(notificationsApi.listNotifications).toBe(mockApi.listNotifications);
    expect(notificationsApi.markNotificationAsRead).toBe(mockApi.markNotificationAsRead);
    expect(socketClient).toBeInstanceOf(MockSocketClient);
  });

  it('serves the real notificationsApi and a RealSocketClient when VITE_USE_MOCK_API is not "true"', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false');
    vi.resetModules();

    const { notificationsApi, socketClient } = await import('../index');
    const realApi = await import('../api');
    const { RealSocketClient } = await import('@infrastructure/socketClient');

    expect(notificationsApi.listNotifications).toBe(realApi.listNotifications);
    expect(notificationsApi.markNotificationAsRead).toBe(realApi.markNotificationAsRead);
    expect(socketClient).toBeInstanceOf(RealSocketClient);
  });
});
