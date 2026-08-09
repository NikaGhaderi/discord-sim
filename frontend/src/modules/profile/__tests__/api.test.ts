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
    it('getMyProfile requests /api/users/me/profile/', async () => {
      const mockData = { user_id: 1, username: 'user1', display_name: 'User 1', avatar_url: null, bio: '', allow_group_invitations: true };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

      const result = await realApi.getMyProfile();

      expect(apiClient.get).toHaveBeenCalledWith('/api/users/me/profile/');
      expect(result).toEqual(mockData);
    });

    it('updateProfile patches /api/users/me/profile/', async () => {
      const payload = { display_name: 'New Name' };
      const mockData = { user_id: 1, username: 'user1', display_name: 'New Name', avatar_url: null, bio: '', allow_group_invitations: true };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockData });

      const result = await realApi.updateProfile(payload);

      expect(apiClient.patch).toHaveBeenCalledWith('/api/users/me/profile/', payload);
      expect(result).toEqual(mockData);
    });

    it('getPublicProfile requests /api/users/:username/profile/', async () => {
      const mockData = { user_id: 2, username: 'john', display_name: 'John', avatar_url: null, bio: '' };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

      const result = await realApi.getPublicProfile('john');

      expect(apiClient.get).toHaveBeenCalledWith('/api/users/john/profile/');
      expect(result).toEqual(mockData);
    });

    it('listPublicProfilesByIds requests GET /api/users/by-ids/ with a comma-joined ids param', async () => {
      const mockData = [
        { user_id: 1, username: 'a', display_name: 'A', avatar_url: null, bio: '' },
        { user_id: 2, username: 'b', display_name: 'B', avatar_url: null, bio: '' },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

      const result = await realApi.listPublicProfilesByIds([1, 2]);

      expect(apiClient.get).toHaveBeenCalledWith('/api/users/by-ids/', {
        params: { ids: '1,2' },
      });
      expect(result).toEqual(mockData);
    });

    it('listPublicProfilesByIds short-circuits to [] without an HTTP call for an empty list', async () => {
      const result = await realApi.listPublicProfilesByIds([]);

      expect(apiClient.get).not.toHaveBeenCalled();
      expect(result).toEqual([]);
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

    it('listPublicProfilesByIds mock synthesizes stable profiles per id', async () => {
      const first = await mockApi.listPublicProfilesByIds([1001, 1002]);
      const second = await mockApi.listPublicProfilesByIds([1001]);

      expect(first).toHaveLength(2);
      expect(first[0]).not.toHaveProperty('allow_group_invitations');
      expect(second[0]).toEqual(first.find((p) => p.user_id === 1001));
    });

    it('listPublicProfilesByIds mock resolves the fixed mock current user by their real id', async () => {
      const myProfile = await mockApi.getMyProfile();

      const [resolved] = await mockApi.listPublicProfilesByIds([myProfile.user_id]);

      expect(resolved.username).toBe(myProfile.username);
    });
  });
});