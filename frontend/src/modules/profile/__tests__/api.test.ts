import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@infrastructure/apiClient';
import * as realApi from '../api';
import * as mockApi from '../mockApi';

vi.mock('@infrastructure/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('Profile API (SCRUM-29)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Real API', () => {
    it('getMyProfile requests /api/profile/me/', async () => {
      const mockData = { user_id: '1', username: 'user1', display_name: 'User 1', avatar_url: null, bio: '', allow_group_invitations: true };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

      const result = await realApi.getMyProfile();

      expect(apiClient.get).toHaveBeenCalledWith('/api/profile/me/');
      expect(result).toEqual(mockData);
    });

    it('updateProfile patches /api/profile/me/', async () => {
      const payload = { display_name: 'New Name' };
      const mockData = { user_id: '1', username: 'user1', display_name: 'New Name', avatar_url: null, bio: '', allow_group_invitations: true };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockData });

      const result = await realApi.updateProfile(payload);

      expect(apiClient.patch).toHaveBeenCalledWith('/api/profile/me/', payload);
      expect(result).toEqual(mockData);
    });

    it('getPublicProfile requests /api/profile/:username/', async () => {
      const mockData = { user_id: '2', username: 'john', display_name: 'John', avatar_url: null, bio: '' };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

      const result = await realApi.getPublicProfile('john');

      expect(apiClient.get).toHaveBeenCalledWith('/api/profile/john/');
      expect(result).toEqual(mockData);
    });
  });

  describe('Mock API Contract Verification', () => {
    it('getPublicProfile mock does NOT return allow_group_invitations', async () => {
      const publicProfile = await mockApi.getPublicProfile('someuser');

      expect(publicProfile).not.toHaveProperty('allow_group_invitations');
      expect(publicProfile.username).toBe('someuser');
    });

    it('getMyProfile mock includes allow_group_invitations', async () => {
      const myProfile = await mockApi.getMyProfile();

      expect(myProfile).toHaveProperty('allow_group_invitations');
    });
  });
});