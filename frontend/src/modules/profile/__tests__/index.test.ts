import { describe, it, expect, afterEach, vi } from 'vitest';

describe('Profile module selector (index.ts)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('serves mockApi functions when VITE_USE_MOCK_API is "true"', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true');
    vi.resetModules();

    const { profileApi } = await import('../index');
    const mockApi = await import('../mockApi');

    expect(profileApi.getMyProfile).toBe(mockApi.getMyProfile);
    expect(profileApi.updateProfile).toBe(mockApi.updateProfile);
    expect(profileApi.getPublicProfile).toBe(mockApi.getPublicProfile);
    expect(profileApi.listPublicProfilesByIds).toBe(mockApi.listPublicProfilesByIds);
    expect(profileApi.uploadAvatar).toBe(mockApi.uploadAvatar);
  });

  it('serves the real api functions when VITE_USE_MOCK_API is not "true"', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false');
    vi.resetModules();

    const { profileApi } = await import('../index');
    const realApi = await import('../api');

    expect(profileApi.getMyProfile).toBe(realApi.getMyProfile);
    expect(profileApi.updateProfile).toBe(realApi.updateProfile);
    expect(profileApi.getPublicProfile).toBe(realApi.getPublicProfile);
    expect(profileApi.listPublicProfilesByIds).toBe(realApi.listPublicProfilesByIds);
    expect(profileApi.uploadAvatar).toBe(realApi.uploadAvatar);
  });
});
