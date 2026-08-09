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

describe('Private Spaces API (SCRUM-35)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Real API', () => {
    it('listDirectChats requests GET /api/dms/', async () => {
      const mockData = [
        { direct_chat_id: 1, user1_id: 1, user2_id: 2, created_at: '2026-01-01T00:00:00Z' },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

      const result = await realApi.listDirectChats();

      expect(apiClient.get).toHaveBeenCalledWith('/api/dms/');
      expect(result).toEqual(mockData);
    });

    it('createOrGetDirectChat posts to /api/dms/ and reports created:true on 201', async () => {
      const chat = { direct_chat_id: 5, user1_id: 1, user2_id: 9, created_at: '2026-01-01T00:00:00Z' };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: chat, status: 201 });

      const result = await realApi.createOrGetDirectChat(9);

      expect(apiClient.post).toHaveBeenCalledWith('/api/dms/', { target_user_id: 9 });
      expect(result).toEqual({ chat, created: true });
    });

    it('createOrGetDirectChat reports created:false on 200 (already existed)', async () => {
      const chat = { direct_chat_id: 5, user1_id: 1, user2_id: 9, created_at: '2026-01-01T00:00:00Z' };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: chat, status: 200 });

      const result = await realApi.createOrGetDirectChat(9);

      expect(result).toEqual({ chat, created: false });
    });

    it('deleteDirectChat DELETEs /api/dms/:id/', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ status: 204 });

      await realApi.deleteDirectChat(5);

      expect(apiClient.delete).toHaveBeenCalledWith('/api/dms/5/');
    });

    it('listGroups requests GET /api/groups/', async () => {
      const mockData = [{ group_id: 1, name: 'Team', creator_id: 1, created_at: '2026-01-01T00:00:00Z' }];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

      const result = await realApi.listGroups();

      expect(apiClient.get).toHaveBeenCalledWith('/api/groups/');
      expect(result).toEqual(mockData);
    });

    it('createGroup posts to /api/groups/', async () => {
      const group = { group_id: 1, name: 'Team', creator_id: 1, created_at: '2026-01-01T00:00:00Z' };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: group, status: 201 });

      const result = await realApi.createGroup('Team');

      expect(apiClient.post).toHaveBeenCalledWith('/api/groups/', { name: 'Team' });
      expect(result).toEqual(group);
    });

    it('getGroup requests GET /api/groups/:id/', async () => {
      const group = { group_id: 1, name: 'Team', creator_id: 1, created_at: '2026-01-01T00:00:00Z' };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: group });

      const result = await realApi.getGroup(1);

      expect(apiClient.get).toHaveBeenCalledWith('/api/groups/1/');
      expect(result).toEqual(group);
    });

    it('listGroupMembers requests GET /api/groups/:id/members/', async () => {
      const members = [
        { user_id: 1, is_admin: true, joined_at: '2026-01-01T00:00:00Z' },
        { user_id: 2, is_admin: false, joined_at: '2026-01-02T00:00:00Z' },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: members });

      const result = await realApi.listGroupMembers(1);

      expect(apiClient.get).toHaveBeenCalledWith('/api/groups/1/members/');
      expect(result).toEqual(members);
    });

    it('updateGroup PATCHes /api/groups/:id/', async () => {
      const group = { group_id: 1, name: 'New Name', creator_id: 1, created_at: '2026-01-01T00:00:00Z' };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: group });

      const result = await realApi.updateGroup(1, 'New Name');

      expect(apiClient.patch).toHaveBeenCalledWith('/api/groups/1/', { name: 'New Name' });
      expect(result).toEqual(group);
    });

    it('deleteOrLeaveGroup with mode "delete" DELETEs /api/groups/:id/', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ status: 204 });

      await realApi.deleteOrLeaveGroup(1, 'delete');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/groups/1/');
    });

    it('deleteOrLeaveGroup with mode "leave" DELETEs /api/groups/:id/leave/', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ status: 204 });

      await realApi.deleteOrLeaveGroup(1, 'leave');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/groups/1/leave/');
    });

    it('sendGroupInvitation posts to /api/groups/:id/invitations/ and reports created:true on 201', async () => {
      const invitation = {
        invitation_id: 1,
        group_id: 1,
        inviter_id: 1,
        invitee_id: 2,
        status: 'PENDING',
        created_at: '2026-01-01T00:00:00Z',
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: invitation, status: 201 });

      const result = await realApi.sendGroupInvitation(1, 2);

      expect(apiClient.post).toHaveBeenCalledWith('/api/groups/1/invitations/', { invitee_id: 2 });
      expect(result).toEqual({ invitation, created: true });
    });

    it('sendGroupInvitation reports created:false on 200', async () => {
      const invitation = {
        invitation_id: 1,
        group_id: 1,
        inviter_id: 1,
        invitee_id: 2,
        status: 'PENDING',
        created_at: '2026-01-01T00:00:00Z',
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: invitation, status: 200 });

      const result = await realApi.sendGroupInvitation(1, 2);

      expect(result).toEqual({ invitation, created: false });
    });

    it('respondToInvitation PATCHes /api/invitations/:id/ with only invitation_id and status', async () => {
      const responseData = { invitation_id: 1, status: 'ACCEPTED' };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: responseData });

      const result = await realApi.respondToInvitation(1, 'ACCEPTED');

      expect(apiClient.patch).toHaveBeenCalledWith('/api/invitations/1/', { status: 'ACCEPTED' });
      expect(result).toEqual(responseData);
    });

    it('listMyInvitations requests GET /api/invitations/ with limit/offset params', async () => {
      const page = { count: 0, next: null, previous: null, results: [] };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: page });

      const result = await realApi.listMyInvitations(10, 20);

      expect(apiClient.get).toHaveBeenCalledWith('/api/invitations/', {
        params: { limit: 10, offset: 20 },
      });
      expect(result).toEqual(page);
    });
  });

  describe('Mock API Contract Verification', () => {
    it('createOrGetDirectChat mock is idempotent on a repeat call with the same target', async () => {
      const first = await mockApi.createOrGetDirectChat(9999);
      expect(first.created).toBe(true);

      const second = await mockApi.createOrGetDirectChat(9999);
      expect(second.created).toBe(false);
      expect(second.chat.direct_chat_id).toBe(first.chat.direct_chat_id);
    });

    it('sendGroupInvitation mock is idempotent for the same group/invitee while pending', async () => {
      const first = await mockApi.sendGroupInvitation(1, 8888);
      expect(first.created).toBe(true);

      const second = await mockApi.sendGroupInvitation(1, 8888);
      expect(second.created).toBe(false);
      expect(second.invitation.invitation_id).toBe(first.invitation.invitation_id);
    });

    it('listDirectChats mock returns the real DirectChat shape', async () => {
      const chats = await mockApi.listDirectChats();
      expect(chats.length).toBeGreaterThan(0);
      expect(chats[0]).toHaveProperty('direct_chat_id');
      expect(chats[0]).toHaveProperty('user1_id');
      expect(chats[0]).toHaveProperty('user2_id');
      expect(chats[0]).toHaveProperty('created_at');
      expect(chats[0]).not.toHaveProperty('recipient_username');
    });

    it('listGroups mock returns the real Group shape (member counts come from listGroupMembers, not an inline field)', async () => {
      const groups = await mockApi.listGroups();
      expect(groups.length).toBeGreaterThan(0);
      expect(groups[0]).toHaveProperty('group_id');
      expect(groups[0]).toHaveProperty('creator_id');
      expect(groups[0]).not.toHaveProperty('member_count');
      expect(groups[0]).not.toHaveProperty('is_admin');
    });

    it('listGroupMembers mock returns the seeded creator as admin for group 1', async () => {
      const members = await mockApi.listGroupMembers(1);
      expect(members.length).toBeGreaterThan(0);
      expect(members[0]).toHaveProperty('user_id');
      expect(members[0]).toHaveProperty('is_admin');
      expect(members[0]).toHaveProperty('joined_at');
    });

    it('listGroupMembers mock returns an empty list for an unknown group', async () => {
      const members = await mockApi.listGroupMembers(999999);
      expect(members).toEqual([]);
    });

    it('createGroup mock seeds the creator as the sole admin member', async () => {
      const group = await mockApi.createGroup('Fresh Group');
      const members = await mockApi.listGroupMembers(group.group_id);

      expect(members).toHaveLength(1);
      expect(members[0].is_admin).toBe(true);
    });

    it('respondToInvitation mock adds the invitee as a member on ACCEPTED', async () => {
      const { invitation } = await mockApi.sendGroupInvitation(2, 7777);
      await mockApi.respondToInvitation(invitation.invitation_id, 'ACCEPTED');

      const members = await mockApi.listGroupMembers(2);
      expect(members.some((m) => m.user_id === 7777 && !m.is_admin)).toBe(true);
    });

    it('respondToInvitation mock does NOT add a member on DECLINED', async () => {
      const { invitation } = await mockApi.sendGroupInvitation(2, 6666);
      await mockApi.respondToInvitation(invitation.invitation_id, 'DECLINED');

      const members = await mockApi.listGroupMembers(2);
      expect(members.some((m) => m.user_id === 6666)).toBe(false);
    });
  });
});
