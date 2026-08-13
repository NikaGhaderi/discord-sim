import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DirectMessageList } from '../components/DirectMessageList';
import { GroupList } from '../components/GroupList';
import { GroupSettingsPanel } from '../components/GroupSettingsPanel';
import { InvitationList } from '../components/InvitationList';
import { PrivateSpacesPage } from '../pages/PrivateSpacesPage';
import { privateSpacesApi } from '../index';
import { profileApi } from '../../profile';
import { messagingApi } from '../../messaging';

vi.mock('../index', () => ({
  privateSpacesApi: {
    listDirectChats: vi.fn(),
    createOrGetDirectChat: vi.fn(),
    deleteDirectChat: vi.fn(),
    listGroups: vi.fn(),
    createGroup: vi.fn(),
    getGroup: vi.fn(),
    listGroupMembers: vi.fn(),
    updateGroup: vi.fn(),
    deleteOrLeaveGroup: vi.fn(),
    sendGroupInvitation: vi.fn(),
    respondToInvitation: vi.fn(),
    listMyInvitations: vi.fn(),
  },
}));

vi.mock('../../profile', () => ({
  profileApi: {
    getMyProfile: vi.fn(),
    updateProfile: vi.fn(),
    getPublicProfile: vi.fn(),
    listPublicProfilesByIds: vi.fn(),
  },
}));

vi.mock('../../notifications', () => ({
  notificationsApi: {
    listNotifications: vi.fn().mockResolvedValue([]),
    markNotificationAsRead: vi.fn(),
  },
  socketClient: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    onNewMessage: vi.fn(() => vi.fn()),
    onMessageDeleted: vi.fn(() => vi.fn()),
    onNewNotification: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../messaging', () => ({
  messagingApi: {
    sendMessage: vi.fn(),
    listMessages: vi.fn().mockResolvedValue({ count: 0, next: null, previous: null, results: [] }),
    editMessage: vi.fn(),
    deleteMessage: vi.fn(),
    attachMedia: vi.fn(),
    searchMessages: vi.fn(),
    createScheduledMessage: vi.fn(),
    cancelScheduledMessage: vi.fn(),
    listScheduledMessages: vi.fn(),
  },
}));

const currentUserId = 111;

describe('Private Spaces (SCRUM-35 network wiring)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Safe defaults so components that call these as a side detail (not
    // the thing under test in a given case) don't blow up on an
    // unmocked-returns-undefined call.
    vi.mocked(privateSpacesApi.listGroupMembers).mockResolvedValue([]);
    vi.mocked(profileApi.listPublicProfilesByIds).mockResolvedValue([]);
  });

  describe('InvitationList', () => {
    it('shows the group name from the invitation itself and resolves the inviter, then removes on accept/decline', async () => {
      vi.mocked(privateSpacesApi.listMyInvitations).mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            invitation_id: 1,
            group_id: 2,
            group_name: 'Backend Devs',
            inviter_id: 500,
            invitee_id: currentUserId,
            status: 'PENDING',
            created_at: '2026-08-08T00:00:00Z',
          },
        ],
      });
      vi.mocked(profileApi.listPublicProfilesByIds).mockResolvedValueOnce([
        {
          user_id: 500,
          username: 'samyar_l',
          display_name: 'Samyar Lajevardi',
          avatar_url: 'https://storage/avatars/samyar.jpg',
          bio: '',
        },
      ]);
      vi.mocked(privateSpacesApi.respondToInvitation).mockResolvedValueOnce({
        invitation_id: 1,
        status: 'ACCEPTED',
      });

      render(<InvitationList />);

      // getGroup is deliberately never called -- GetGroupUseCase requires
      // membership, which a pending invitee doesn't have yet; the group
      // name comes straight from the invitation payload instead.
      expect(await screen.findByText('# Backend Devs')).toBeInTheDocument();
      expect(privateSpacesApi.getGroup).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(profileApi.listPublicProfilesByIds).toHaveBeenCalledWith([500]);
      });
      expect(await screen.findByText(/Invited by samyar_l/)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'samyar_l' })).toHaveAttribute(
        'src',
        'https://storage/avatars/samyar.jpg'
      );

      fireEvent.click(screen.getByRole('button', { name: /accept/i }));

      await waitFor(() => {
        expect(privateSpacesApi.respondToInvitation).toHaveBeenCalledWith(1, 'ACCEPTED');
      });
      await waitFor(() => {
        expect(screen.queryByText('# Backend Devs')).not.toBeInTheDocument();
      });
    });

    it('falls back to "User #id" when the inviter cannot be resolved', async () => {
      vi.mocked(privateSpacesApi.listMyInvitations).mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            invitation_id: 1,
            group_id: 2,
            group_name: 'Backend Devs',
            inviter_id: 999,
            invitee_id: currentUserId,
            status: 'PENDING',
            created_at: '2026-08-08T00:00:00Z',
          },
        ],
      });
      // Deleted/unresolvable inviter -- the bulk lookup returns nothing for it.
      vi.mocked(profileApi.listPublicProfilesByIds).mockResolvedValueOnce([]);

      render(<InvitationList />);

      expect(await screen.findByText(/Invited by User #999/)).toBeInTheDocument();
    });

    it('falls back to "Group #id" when group_name is null', async () => {
      vi.mocked(privateSpacesApi.listMyInvitations).mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            invitation_id: 1,
            group_id: 42,
            group_name: null,
            inviter_id: 500,
            invitee_id: currentUserId,
            status: 'PENDING',
            created_at: '2026-08-08T00:00:00Z',
          },
        ],
      });
      vi.mocked(profileApi.listPublicProfilesByIds).mockResolvedValueOnce([]);

      render(<InvitationList />);

      expect(await screen.findByText('# Group #42')).toBeInTheDocument();
    });
  });

  describe('GroupSettingsPanel', () => {
    const group = {
      group_id: 1,
      name: 'Admin Room',
      creator_id: currentUserId,
      created_at: '2026-01-01T00:00:00Z',
    };

    // The backend has no admin check on either endpoint -- DeleteGroupUseCase
    // explicitly allows any member to delete the whole group (Phase 1 doc
    // §8-3-6 supersedes SCRUM-26's original admin-only AC) -- so both actions
    // are offered to every member, gated only by a confirm() dialog.
    it('always offers both "Leave Group" and "Delete Group"', async () => {
      render(<GroupSettingsPanel group={group} />);

      expect(
        await screen.findByRole('button', { name: /delete group/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /leave group/i })
      ).toBeInTheDocument();
    });

    it('calls deleteOrLeaveGroup with mode "delete" after confirming', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.mocked(privateSpacesApi.deleteOrLeaveGroup).mockResolvedValueOnce(undefined);
      render(<GroupSettingsPanel group={group} />);

      fireEvent.click(await screen.findByRole('button', { name: /delete group/i }));

      await waitFor(() => {
        expect(privateSpacesApi.deleteOrLeaveGroup).toHaveBeenCalledWith(1, 'delete');
      });
    });

    it('calls deleteOrLeaveGroup with mode "leave" after confirming', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.mocked(privateSpacesApi.deleteOrLeaveGroup).mockResolvedValueOnce(undefined);
      render(<GroupSettingsPanel group={group} />);

      fireEvent.click(await screen.findByRole('button', { name: /leave group/i }));

      await waitFor(() => {
        expect(privateSpacesApi.deleteOrLeaveGroup).toHaveBeenCalledWith(1, 'leave');
      });
    });

    it('does not call deleteOrLeaveGroup when the confirm dialog is dismissed', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(<GroupSettingsPanel group={group} />);

      fireEvent.click(await screen.findByRole('button', { name: /delete group/i }));

      expect(privateSpacesApi.deleteOrLeaveGroup).not.toHaveBeenCalled();
    });

    it('invites a member by username, resolving it to a user_id first', async () => {
      vi.mocked(profileApi.getPublicProfile).mockResolvedValueOnce({
        user_id: 555,
        username: 'new_teammate',
        display_name: 'New Teammate',
        avatar_url: null,
        bio: '',
      });
      vi.mocked(privateSpacesApi.sendGroupInvitation).mockResolvedValueOnce({
        invitation: {
          invitation_id: 1,
          group_id: 1,
          group_name: null,
          inviter_id: currentUserId,
          invitee_id: 555,
          status: 'PENDING',
          created_at: '2026-01-01T00:00:00Z',
        },
        created: true,
      });
      render(<GroupSettingsPanel group={group} />);

      fireEvent.change(screen.getByLabelText(/invite a member/i), {
        target: { value: 'new_teammate' },
      });
      fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

      await waitFor(() => {
        expect(profileApi.getPublicProfile).toHaveBeenCalledWith('new_teammate');
      });
      await waitFor(() => {
        expect(privateSpacesApi.sendGroupInvitation).toHaveBeenCalledWith(1, 555);
      });
      expect(await screen.findByText('Invitation sent to new_teammate.')).toBeInTheDocument();
    });

    it('shows an error when inviting an unknown username', async () => {
      vi.mocked(profileApi.getPublicProfile).mockRejectedValueOnce(new Error('not found'));
      render(<GroupSettingsPanel group={group} />);

      fireEvent.change(screen.getByLabelText(/invite a member/i), {
        target: { value: 'ghost' },
      });
      fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

      expect(
        await screen.findByText(`Couldn't invite "ghost". Check the username and try again.`)
      ).toBeInTheDocument();
      expect(privateSpacesApi.sendGroupInvitation).not.toHaveBeenCalled();
    });

    it('fetches and displays members with resolved usernames and an admin badge', async () => {
      vi.mocked(privateSpacesApi.listGroupMembers).mockResolvedValueOnce([
        { user_id: currentUserId, is_admin: true, joined_at: '2026-01-01T00:00:00Z' },
        { user_id: 222, is_admin: false, joined_at: '2026-01-02T00:00:00Z' },
      ]);
      vi.mocked(profileApi.listPublicProfilesByIds).mockResolvedValueOnce([
        {
          user_id: currentUserId,
          username: 'me',
          display_name: 'Me',
          avatar_url: null,
          bio: '',
        },
        {
          user_id: 222,
          username: 'teammate',
          display_name: 'Teammate',
          avatar_url: 'https://storage/avatars/teammate.jpg',
          bio: '',
        },
      ]);

      render(<GroupSettingsPanel group={group} />);

      expect(await screen.findByText(/me \(admin\)/)).toBeInTheDocument();
      expect(screen.getByText('teammate')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'teammate' })).toHaveAttribute(
        'src',
        'https://storage/avatars/teammate.jpg'
      );
      expect(privateSpacesApi.listGroupMembers).toHaveBeenCalledWith(1);
    });

    it('falls back to "User #id" for members that cannot be resolved', async () => {
      vi.mocked(privateSpacesApi.listGroupMembers).mockResolvedValueOnce([
        { user_id: 333, is_admin: false, joined_at: '2026-01-01T00:00:00Z' },
      ]);
      vi.mocked(profileApi.listPublicProfilesByIds).mockResolvedValueOnce([]);

      render(<GroupSettingsPanel group={group} />);

      expect(await screen.findByText('User #333')).toBeInTheDocument();
    });

    it('shows an error message if members fail to load', async () => {
      vi.mocked(privateSpacesApi.listGroupMembers).mockRejectedValueOnce(
        new Error('boom')
      );

      render(<GroupSettingsPanel group={group} />);

      expect(await screen.findByText(/couldn't load members/i)).toBeInTheDocument();
    });
  });

  describe('DirectMessageList', () => {
    it('renders fetched DMs with the resolved username', async () => {
      vi.mocked(privateSpacesApi.listDirectChats).mockResolvedValueOnce([
        { direct_chat_id: 1, user1_id: currentUserId, user2_id: 777, created_at: '2026-01-01T00:00:00Z' },
      ]);
      vi.mocked(profileApi.listPublicProfilesByIds).mockResolvedValueOnce([
        {
          user_id: 777,
          username: 'ftm_roosta',
          display_name: 'Fatemeh Roosta',
          avatar_url: 'https://storage/avatars/fatemeh.jpg',
          bio: '',
        },
      ]);

      render(<DirectMessageList currentUserId={currentUserId} />);

      expect(await screen.findByText('ftm_roosta')).toBeInTheDocument();
      expect(profileApi.listPublicProfilesByIds).toHaveBeenCalledWith([777]);
      expect(screen.getByRole('img', { name: 'ftm_roosta' })).toHaveAttribute(
        'src',
        'https://storage/avatars/fatemeh.jpg'
      );
    });

    it('falls back to a generated initial when the participant has no avatar_url', async () => {
      vi.mocked(privateSpacesApi.listDirectChats).mockResolvedValueOnce([
        { direct_chat_id: 1, user1_id: currentUserId, user2_id: 778, created_at: '2026-01-01T00:00:00Z' },
      ]);
      vi.mocked(profileApi.listPublicProfilesByIds).mockResolvedValueOnce([
        {
          user_id: 778,
          username: 'no_avatar_user',
          display_name: 'No Avatar',
          avatar_url: null,
          bio: '',
        },
      ]);

      render(<DirectMessageList currentUserId={currentUserId} />);

      const fallback = await screen.findByRole('img', { name: 'no_avatar_user' });
      expect(fallback.tagName).toBe('SPAN');
      expect(fallback).toHaveTextContent('N');
    });

    it('falls back to "User #id" when the other participant cannot be resolved', async () => {
      vi.mocked(privateSpacesApi.listDirectChats).mockResolvedValueOnce([
        { direct_chat_id: 1, user1_id: currentUserId, user2_id: 777, created_at: '2026-01-01T00:00:00Z' },
      ]);
      vi.mocked(profileApi.listPublicProfilesByIds).mockResolvedValueOnce([]);

      render(<DirectMessageList currentUserId={currentUserId} />);

      expect(await screen.findByText('User #777')).toBeInTheDocument();
    });

    it('resolves username to user_id via getPublicProfile then starts a DM', async () => {
      vi.mocked(privateSpacesApi.listDirectChats).mockResolvedValueOnce([]);
      vi.mocked(profileApi.getPublicProfile).mockResolvedValueOnce({
        user_id: 42,
        username: 'test_user',
        display_name: 'Test User',
        avatar_url: null,
        bio: '',
      });
      vi.mocked(privateSpacesApi.createOrGetDirectChat).mockResolvedValueOnce({
        chat: { direct_chat_id: 9, user1_id: currentUserId, user2_id: 42, created_at: '2026-01-01T00:00:00Z' },
        created: true,
      });
      vi.mocked(profileApi.listPublicProfilesByIds).mockResolvedValueOnce([]);

      render(<DirectMessageList currentUserId={currentUserId} />);
      await waitFor(() => expect(privateSpacesApi.listDirectChats).toHaveBeenCalled());

      fireEvent.click(screen.getByRole('button', { name: /start new dm/i }));
      const input = screen.getByPlaceholderText(/enter username.../i);
      fireEvent.change(input, { target: { value: 'test_user' } });
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }));

      await waitFor(() => {
        expect(profileApi.getPublicProfile).toHaveBeenCalledWith('test_user');
      });
      await waitFor(() => {
        expect(privateSpacesApi.createOrGetDirectChat).toHaveBeenCalledWith(42);
      });
      expect(await screen.findByText('User #42')).toBeInTheDocument();
    });
  });

  describe('GroupList', () => {
    it('renders fetched groups with a resolved member count and allows creating a new group', async () => {
      vi.mocked(privateSpacesApi.listGroups).mockResolvedValueOnce([
        { group_id: 1, name: 'Frontend Team', creator_id: currentUserId, created_at: '2026-01-01T00:00:00Z' },
      ]);
      vi.mocked(privateSpacesApi.listGroupMembers).mockImplementation(async (groupId) => {
        if (groupId === 1) {
          return [
            { user_id: currentUserId, is_admin: true, joined_at: '2026-01-01T00:00:00Z' },
            { user_id: 222, is_admin: false, joined_at: '2026-01-02T00:00:00Z' },
          ];
        }
        if (groupId === 2) {
          return [{ user_id: currentUserId, is_admin: true, joined_at: '2026-01-01T00:00:00Z' }];
        }
        return [];
      });
      vi.mocked(privateSpacesApi.createGroup).mockResolvedValueOnce({
        group_id: 2,
        name: 'New Test Group',
        creator_id: currentUserId,
        created_at: '2026-01-01T00:00:00Z',
      });

      render(<GroupList />);

      expect(await screen.findByText('Frontend Team')).toBeInTheDocument();
      expect(await screen.findByText(/2 members/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /create group/i }));
      const input = screen.getByPlaceholderText(/group name/i);
      fireEvent.change(input, { target: { value: 'New Test Group' } });
      fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

      expect(await screen.findByText('New Test Group')).toBeInTheDocument();
      expect(privateSpacesApi.createGroup).toHaveBeenCalledWith('New Test Group');
      expect(await screen.findByText(/1 member\)/)).toBeInTheDocument();
    });

    it('drops a group from the list when removedGroupId is set, without a refetch', async () => {
      vi.mocked(privateSpacesApi.listGroups).mockResolvedValueOnce([
        { group_id: 1, name: 'Frontend Team', creator_id: currentUserId, created_at: '2026-01-01T00:00:00Z' },
        { group_id: 2, name: 'Backend Team', creator_id: currentUserId, created_at: '2026-01-01T00:00:00Z' },
      ]);

      const { rerender } = render(<GroupList removedGroupId={null} />);
      expect(await screen.findByText('Frontend Team')).toBeInTheDocument();
      expect(screen.getByText('Backend Team')).toBeInTheDocument();

      rerender(<GroupList removedGroupId={1} />);

      await waitFor(() =>
        expect(screen.queryByText('Frontend Team')).not.toBeInTheDocument()
      );
      expect(screen.getByText('Backend Team')).toBeInTheDocument();
      expect(privateSpacesApi.listGroups).toHaveBeenCalledTimes(1);
    });
  });

  describe('PrivateSpacesPage', () => {
    it('loads the current user id via profileApi before rendering, then shows group settings for the selected group', async () => {
      vi.mocked(profileApi.getMyProfile).mockResolvedValueOnce({
        user_id: currentUserId,
        username: 'me',
        display_name: 'Me',
        avatar_url: null,
        bio: '',
        allow_group_invitations: true,
      });
      vi.mocked(privateSpacesApi.listDirectChats).mockResolvedValueOnce([]);
      vi.mocked(privateSpacesApi.listGroups).mockResolvedValueOnce([
        { group_id: 1, name: 'Admin Room', creator_id: currentUserId, created_at: '2026-01-01T00:00:00Z' },
      ]);
      vi.mocked(privateSpacesApi.listMyInvitations).mockResolvedValueOnce({
        count: 0,
        next: null,
        previous: null,
        results: [],
      });

      render(<PrivateSpacesPage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      const groupItem = await screen.findByText('Admin Room');
      fireEvent.click(groupItem);

      fireEvent.click(await screen.findByRole('button', { name: 'Settings' }));

      expect(await screen.findByRole('button', { name: /delete group/i })).toBeInTheDocument();
    });

    it('shows a real chat thread for the selected group', async () => {
      vi.mocked(profileApi.getMyProfile).mockResolvedValueOnce({
        user_id: currentUserId,
        username: 'me',
        display_name: 'Me',
        avatar_url: null,
        bio: '',
        allow_group_invitations: true,
      });
      vi.mocked(privateSpacesApi.listDirectChats).mockResolvedValueOnce([]);
      vi.mocked(privateSpacesApi.listGroups).mockResolvedValueOnce([
        { group_id: 1, name: 'Admin Room', creator_id: currentUserId, created_at: '2026-01-01T00:00:00Z' },
      ]);
      vi.mocked(privateSpacesApi.listMyInvitations).mockResolvedValueOnce({
        count: 0,
        next: null,
        previous: null,
        results: [],
      });
      vi.mocked(messagingApi.listMessages).mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            base_message_id: 1,
            sender_id: currentUserId,
            sender_username: 'me',
            content: 'hello group',
            sent_at: '2026-01-01T00:00:00Z',
            is_edited: false,
            media: [],
          },
        ],
      });

      render(<PrivateSpacesPage />);

      fireEvent.click(await screen.findByText('Admin Room'));

      expect(await screen.findByText('hello group')).toBeInTheDocument();
      expect(messagingApi.listMessages).toHaveBeenCalledWith({ group_id: 1 }, 20, 0);
    });

    it('shows real usernames as message senders in a group, not "User #<id>"', async () => {
      vi.mocked(profileApi.getMyProfile).mockResolvedValueOnce({
        user_id: currentUserId,
        username: 'me',
        display_name: 'Me',
        avatar_url: null,
        bio: '',
        allow_group_invitations: true,
      });
      vi.mocked(privateSpacesApi.listDirectChats).mockResolvedValueOnce([]);
      vi.mocked(privateSpacesApi.listGroups).mockResolvedValueOnce([
        { group_id: 1, name: 'Admin Room', creator_id: currentUserId, created_at: '2026-01-01T00:00:00Z' },
      ]);
      vi.mocked(privateSpacesApi.listMyInvitations).mockResolvedValueOnce({
        count: 0,
        next: null,
        previous: null,
        results: [],
      });
      // mockResolvedValue (not Once): GroupList's own per-group member-count
      // fetch also calls listGroupMembers before the group is even clicked,
      // so a single Once value would be consumed by that call instead of
      // the page's own sender-name resolution.
      vi.mocked(privateSpacesApi.listGroupMembers).mockResolvedValue([
        { user_id: currentUserId, is_admin: true, joined_at: '2026-01-01T00:00:00Z' },
        { user_id: 999, is_admin: false, joined_at: '2026-01-01T00:00:00Z' },
      ]);
      vi.mocked(profileApi.listPublicProfilesByIds).mockResolvedValue([
        { user_id: 999, username: 'samyar_l', display_name: 'Samyar', avatar_url: null, bio: '' },
      ]);
      vi.mocked(messagingApi.listMessages).mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            base_message_id: 1,
            sender_id: 999,
            sender_username: 'User #999',
            content: 'hey team',
            sent_at: '2026-01-01T00:00:00Z',
            is_edited: false,
            media: [],
          },
        ],
      });

      render(<PrivateSpacesPage />);

      fireEvent.click(await screen.findByText('Admin Room'));

      expect(await screen.findByText('samyar_l')).toBeInTheDocument();
      expect(screen.queryByText('User #999')).not.toBeInTheDocument();
    });

    it('shows a real chat thread for a selected DM, resolving the other participant\'s username', async () => {
      vi.mocked(profileApi.getMyProfile).mockResolvedValueOnce({
        user_id: currentUserId,
        username: 'me',
        display_name: 'Me',
        avatar_url: null,
        bio: '',
        allow_group_invitations: true,
      });
      vi.mocked(privateSpacesApi.listDirectChats).mockResolvedValueOnce([
        { direct_chat_id: 9, user1_id: currentUserId, user2_id: 777, created_at: '2026-01-01T00:00:00Z' },
      ]);
      vi.mocked(profileApi.listPublicProfilesByIds).mockResolvedValue([
        {
          user_id: 777,
          username: 'ftm_roosta',
          display_name: 'Fatemeh Roosta',
          avatar_url: null,
          bio: '',
        },
      ]);
      vi.mocked(privateSpacesApi.listGroups).mockResolvedValueOnce([]);
      vi.mocked(privateSpacesApi.listMyInvitations).mockResolvedValueOnce({
        count: 0,
        next: null,
        previous: null,
        results: [],
      });
      vi.mocked(messagingApi.listMessages).mockResolvedValueOnce({
        count: 0,
        next: null,
        previous: null,
        results: [],
      });

      render(<PrivateSpacesPage />);

      fireEvent.click(await screen.findByText('ftm_roosta'));

      await waitFor(() => {
        expect(messagingApi.listMessages).toHaveBeenCalledWith({ direct_chat_id: 9 }, 20, 0);
      });
      // "ftm_roosta" now legitimately appears twice: once in the sidebar DM
      // list item, once in the chat header above the thread.
      expect(screen.getAllByText('ftm_roosta')).toHaveLength(2);
    });

    it('removes a deleted group from the sidebar immediately, without a manual refresh', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.mocked(profileApi.getMyProfile).mockResolvedValueOnce({
        user_id: currentUserId,
        username: 'me',
        display_name: 'Me',
        avatar_url: null,
        bio: '',
        allow_group_invitations: true,
      });
      vi.mocked(privateSpacesApi.listDirectChats).mockResolvedValueOnce([]);
      vi.mocked(privateSpacesApi.listGroups).mockResolvedValueOnce([
        { group_id: 1, name: 'Admin Room', creator_id: currentUserId, created_at: '2026-01-01T00:00:00Z' },
      ]);
      vi.mocked(privateSpacesApi.listMyInvitations).mockResolvedValueOnce({
        count: 0,
        next: null,
        previous: null,
        results: [],
      });
      vi.mocked(privateSpacesApi.deleteOrLeaveGroup).mockResolvedValueOnce(undefined);

      render(<PrivateSpacesPage />);

      const groupItem = await screen.findByText('Admin Room');
      fireEvent.click(groupItem);
      fireEvent.click(await screen.findByRole('button', { name: 'Settings' }));

      fireEvent.click(await screen.findByRole('button', { name: /delete group/i }));

      await waitFor(() => {
        expect(privateSpacesApi.deleteOrLeaveGroup).toHaveBeenCalledWith(1, 'delete');
      });
      // The sidebar entry, the chat header, and the settings modal all key
      // off the same `selected` state, so all three disappear together.
      await waitFor(() =>
        expect(screen.queryByText('Admin Room')).not.toBeInTheDocument()
      );
    });
  });
});
