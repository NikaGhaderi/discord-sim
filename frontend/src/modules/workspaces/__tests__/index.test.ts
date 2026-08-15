import { describe, it, expect, afterEach, vi } from 'vitest';

describe('Workspaces module selector (index.ts)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('serves mockApi functions when VITE_USE_MOCK_API is "true"', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true');
    vi.resetModules();

    const { workspacesApi } = await import('../index');
    const mockApi = await import('../mockApi');

    expect(workspacesApi.listChannels).toBe(mockApi.listChannels);
    expect(workspacesApi.joinChannel).toBe(mockApi.joinChannel);
    expect(workspacesApi.joinChannelByInviteToken).toBe(
      mockApi.joinChannelByInviteToken
    );
    expect(workspacesApi.kickMember).toBe(mockApi.kickMember);
  });

  it('serves the real api functions when VITE_USE_MOCK_API is not "true"', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false');
    vi.resetModules();

    const { workspacesApi } = await import('../index');
    const realApi = await import('../api');

    expect(workspacesApi.listChannels).toBe(realApi.listChannels);
    expect(workspacesApi.joinChannel).toBe(realApi.joinChannel);
    expect(workspacesApi.joinChannelByInviteToken).toBe(
      realApi.joinChannelByInviteToken
    );
    expect(workspacesApi.kickMember).toBe(realApi.kickMember);
  });
});
