import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@infrastructure/apiClient';
import * as realApi from '../api';
import * as mockApi from '../mockApi';

vi.mock('@infrastructure/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Workspaces API (SCRUM-33)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Real API', () => {
    it('listChannels requests GET /api/channels/', async () => {
      const channels = [
        {
          channel_id: 1,
          name: 'General',
          creator_id: 1,
          default_topic_id: 1,
          created_at: '2026-01-01T00:00:00Z',
          invite_token: 'abc123',
        },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: channels });

      const result = await realApi.listChannels();

      expect(apiClient.get).toHaveBeenCalledWith('/api/channels/');
      expect(result).toEqual(channels);
    });

    it('getChannel requests GET /api/channels/:id/', async () => {
      const channel = {
        channel_id: 1,
        name: 'General',
        creator_id: 1,
        default_topic_id: 1,
        created_at: '2026-01-01T00:00:00Z',
        invite_token: 'abc123',
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: channel });

      const result = await realApi.getChannel(1);

      expect(apiClient.get).toHaveBeenCalledWith('/api/channels/1/');
      expect(result).toEqual(channel);
    });

    it('createChannel posts to /api/channels/', async () => {
      const channel = {
        channel_id: 1,
        name: 'General',
        creator_id: 1,
        default_topic_id: 1,
        created_at: '2026-01-01T00:00:00Z',
        invite_token: 'abc123',
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: channel, status: 201 });

      const result = await realApi.createChannel('General');

      expect(apiClient.post).toHaveBeenCalledWith('/api/channels/', { name: 'General' });
      expect(result).toEqual(channel);
    });

    it('updateChannel PATCHes /api/channels/:id/', async () => {
      const response = { channel_id: 1, name: 'Renamed' };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: response });

      const result = await realApi.updateChannel(1, 'Renamed');

      expect(apiClient.patch).toHaveBeenCalledWith('/api/channels/1/', {
        name: 'Renamed',
      });
      expect(result).toEqual(response);
    });

    it('deleteChannel DELETEs /api/channels/:id/', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ status: 204 });

      await realApi.deleteChannel(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/api/channels/1/');
    });

    it('joinChannel POSTs to /api/channels/:id/join/ with an optional nickname', async () => {
      const member = {
        channel_id: 1,
        user_id: 2,
        nickname_in_channel: 'Sprint Master',
        joined_at: '2026-01-01T00:00:00Z',
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: member, status: 201 });

      const result = await realApi.joinChannel(1, 'Sprint Master');

      expect(apiClient.post).toHaveBeenCalledWith('/api/channels/1/join/', {
        nickname_in_channel: 'Sprint Master',
      });
      expect(result).toEqual(member);
    });

    it('joinChannel omits the body when no nickname is given', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          channel_id: 1,
          user_id: 2,
          nickname_in_channel: '',
          joined_at: '2026-01-01T00:00:00Z',
        },
        status: 201,
      });

      await realApi.joinChannel(1);

      expect(apiClient.post).toHaveBeenCalledWith('/api/channels/1/join/', {});
    });

    it('joinChannelByInviteToken POSTs to /api/channels/invite/:token/join/ (separate endpoint from joinChannel)', async () => {
      const member = {
        channel_id: 1,
        user_id: 2,
        nickname_in_channel: 'Guest',
        joined_at: '2026-01-01T00:00:00Z',
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: member, status: 201 });

      const result = await realApi.joinChannelByInviteToken('abc123', 'Guest');

      expect(apiClient.post).toHaveBeenCalledWith('/api/channels/invite/abc123/join/', {
        nickname_in_channel: 'Guest',
      });
      expect(result).toEqual(member);
    });

    it('leaveChannel DELETEs /api/channels/:id/leave/', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ status: 204 });

      await realApi.leaveChannel(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/api/channels/1/leave/');
    });

    it('listMembers requests GET /api/channels/:id/members/', async () => {
      const members = [
        {
          channel_id: 1,
          user_id: 2,
          nickname_in_channel: 'Sprint Master',
          joined_at: '2026-01-01T00:00:00Z',
        },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: members });

      const result = await realApi.listMembers(1);

      expect(apiClient.get).toHaveBeenCalledWith('/api/channels/1/members/');
      expect(result).toEqual(members);
      expect(result[0]).not.toHaveProperty('is_muted');
    });

    it('updateMemberNickname PATCHes /api/channels/:id/members/:userId/', async () => {
      const member = {
        channel_id: 1,
        user_id: 2,
        nickname_in_channel: 'New Nick',
        joined_at: '2026-01-01T00:00:00Z',
      };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: member });

      const result = await realApi.updateMemberNickname(1, 2, 'New Nick');

      expect(apiClient.patch).toHaveBeenCalledWith('/api/channels/1/members/2/', {
        nickname_in_channel: 'New Nick',
      });
      expect(result).toEqual(member);
    });

    it('kickMember DELETEs /api/channels/:id/members/:userId/', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ status: 204 });

      await realApi.kickMember(1, 2);

      expect(apiClient.delete).toHaveBeenCalledWith('/api/channels/1/members/2/');
    });

    it('listRoles requests GET /api/channels/:id/roles/', async () => {
      const roles = [
        { role_id: 3, channel_id: 1, name: 'Moderator', permissions: ['KICK_MEMBERS'] },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: roles });

      const result = await realApi.listRoles(1);

      expect(apiClient.get).toHaveBeenCalledWith('/api/channels/1/roles/');
      expect(result).toEqual(roles);
    });

    it('createRole posts to /api/channels/:id/roles/', async () => {
      const role = {
        role_id: 3,
        channel_id: 1,
        name: 'Moderator',
        permissions: ['KICK_MEMBERS', 'SEND_MEDIA'],
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: role, status: 201 });

      const result = await realApi.createRole(1, {
        name: 'Moderator',
        permissions: ['KICK_MEMBERS', 'SEND_MEDIA'],
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/channels/1/roles/', {
        name: 'Moderator',
        permissions: ['KICK_MEMBERS', 'SEND_MEDIA'],
      });
      expect(result).toEqual(role);
    });

    it('updateRole PATCHes /api/channels/:id/roles/:roleId/', async () => {
      const role = {
        role_id: 3,
        channel_id: 1,
        name: 'Moderator',
        permissions: ['SEND_MEDIA'],
      };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: role });

      const result = await realApi.updateRole(1, 3, { permissions: ['SEND_MEDIA'] });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/channels/1/roles/3/', {
        permissions: ['SEND_MEDIA'],
      });
      expect(result).toEqual(role);
    });

    it('deleteRole DELETEs /api/channels/:id/roles/:roleId/', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ status: 204 });

      await realApi.deleteRole(1, 3);

      expect(apiClient.delete).toHaveBeenCalledWith('/api/channels/1/roles/3/');
    });

    it('assignRole posts to /api/channels/:id/members/:userId/roles/ with role_id', async () => {
      const assignment = {
        userrole_id: 12,
        user_id: 2,
        role_id: 3,
        assigned_at: '2026-01-01T00:00:00Z',
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: assignment, status: 201 });

      const result = await realApi.assignRole(1, 2, 3);

      expect(apiClient.post).toHaveBeenCalledWith('/api/channels/1/members/2/roles/', {
        role_id: 3,
      });
      expect(result).toEqual(assignment);
    });

    it('listTopics requests GET /api/channels/:id/topics/', async () => {
      const topics = [
        { topic_id: 5, channel_id: 1, title: 'general', created_at: '2026-01-01T00:00:00Z' },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: topics });

      const result = await realApi.listTopics(1);

      expect(apiClient.get).toHaveBeenCalledWith('/api/channels/1/topics/');
      expect(result).toEqual(topics);
    });

    it('getTopic requests GET /api/channels/:id/topics/:topicId/', async () => {
      const topic = { topic_id: 5, channel_id: 1, title: 'general', created_at: '2026-01-01T00:00:00Z' };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: topic });

      const result = await realApi.getTopic(1, 5);

      expect(apiClient.get).toHaveBeenCalledWith('/api/channels/1/topics/5/');
      expect(result).toEqual(topic);
    });

    it('createTopic posts to /api/channels/:id/topics/', async () => {
      const topic = { topic_id: 5, channel_id: 1, title: 'general', created_at: '2026-01-01T00:00:00Z' };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: topic, status: 201 });

      const result = await realApi.createTopic(1, 'general');

      expect(apiClient.post).toHaveBeenCalledWith('/api/channels/1/topics/', {
        title: 'general',
      });
      expect(result).toEqual(topic);
    });

    it('deleteTopic DELETEs /api/channels/:id/topics/:topicId/', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ status: 204 });

      await realApi.deleteTopic(1, 5);

      expect(apiClient.delete).toHaveBeenCalledWith('/api/channels/1/topics/5/');
    });
  });

  describe('Mock API Contract Verification', () => {
    it('listChannels mock returns the real Channel shape', async () => {
      const channels = await mockApi.listChannels();
      expect(channels.length).toBeGreaterThan(0);
      expect(channels[0]).toHaveProperty('channel_id');
      expect(channels[0]).toHaveProperty('invite_token');
      expect(channels[0]).toHaveProperty('default_topic_id');
    });

    it('listMembers mock does NOT include a fabricated is_muted field', async () => {
      const members = await mockApi.listMembers(1);
      expect(members[0]).not.toHaveProperty('is_muted');
      expect(members[0]).toHaveProperty('channel_id');
    });

    it('joinChannel and joinChannelByInviteToken mocks are distinct functions with the real ChannelMember shape', async () => {
      const direct = await mockApi.joinChannel(1, 'Direct Joiner');
      const viaInvite = await mockApi.joinChannelByInviteToken('some-token', 'Invited');

      expect(direct.nickname_in_channel).toBe('Direct Joiner');
      expect(viaInvite.nickname_in_channel).toBe('Invited');
      expect(direct).toHaveProperty('channel_id');
      expect(viaInvite).toHaveProperty('channel_id');
    });

    it('kickMember and updateMemberNickname mocks resolve without throwing', async () => {
      await expect(mockApi.kickMember(1, 2)).resolves.toBeUndefined();
      const updated = await mockApi.updateMemberNickname(1, 2, 'Renamed');
      expect(updated.nickname_in_channel).toBe('Renamed');
    });

    it('getChannel and getTopic mocks echo back the requested id', async () => {
      const channel = await mockApi.getChannel(99);
      expect(channel.channel_id).toBe(99);

      const topic = await mockApi.getTopic(99, 7);
      expect(topic.channel_id).toBe(99);
      expect(topic.topic_id).toBe(7);
    });
  });
});
