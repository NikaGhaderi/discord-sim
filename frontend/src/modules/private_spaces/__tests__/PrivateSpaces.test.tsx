import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DirectMessageList } from '../components/DirectMessageList';
import { GroupList } from '../components/GroupList';
import { GroupSettingsPanel } from '../components/GroupSettingsPanel';
import { InvitationList } from '../components/InvitationList';
import { PrivateSpacesPage } from '../pages/PrivateSpacesPage';
import { privateSpacesApi } from '../index';
import { profileApi } from '../../profile';

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
    it('fetches invitations, resolves group + inviter names, and removes on accept/decline', async () => {
      vi.mocked(privateSpacesApi.listMyInvitations).mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            invitation_id: 1,
            group_id: 2,
            inviter_id: 500,
            invitee_id: currentUserId,
            status: 'PENDING',
            created_at: '2026-08-08T00:00:00Z',
          },
        ],
      });
      vi.mocked(privateSpacesApi.getGroup).mockResolvedValueOnce({
        group_id: 2,
        name: 'Backend Devs',
        creator_id: 500,
        created_at: '2026-01-01T00:00:00Z',
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

      expect(await screen.findByText('Backend Devs')).toBeInTheDocument();
      await waitFor(() => {
        expect(profileApi.listPublicProfilesByIds).toHaveBeenCalledWith([500]);
      });
      expect(await screen.findByText(/From samyar_l/)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'samyar_l' })).toHaveAttribute(
        'src',
        'https://storage/avatars/samyar.jpg'
      );

      fireEvent.click(screen.getByRole('button', { name: /accept/i }));

      await waitFor(() => {
        expect(privateSpacesApi.respondToInvitation).toHaveBeenCalledWith(1, 'ACCEPTED');
      });
      await waitFor(() => {
        expect(screen.queryByText('Backend Devs')).not.toBeInTheDocument();
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
            inviter_id: 999,
            invitee_id: currentUserId,
            status: 'PENDING',
            created_at: '2026-08-08T00:00:00Z',
          },
        ],
      });
      vi.mocked(privateSpacesApi.getGroup).mockResolvedValueOnce({
        group_id: 2,
        name: 'Backend Devs',
        creator_id: 999,
        created_at: '2026-01-01T00:00:00Z',
      });
      // Deleted/unresolvable inviter -- the bulk lookup returns nothing for it.
      vi.mocked(profileApi.listPublicProfilesByIds).mockResolvedValueOnce([]);

      render(<InvitationList />);

      expect(await screen.findByText(/From User #999/)).toBeInTheDocument();
    });
  });

  describe('GroupSettingsPanel', () => {
    const group = {
      group_id: 1,
      name: 'Admin Room',
      creator_id: currentUserId,
      created_at: '2026-01-01T00:00:00Z',
    };

    it('displays "Delete Group" label for admin users', async () => {
      render(<GroupSettingsPanel group={group} isAdmin={true} />);

      expect(
        await screen.findByRole('button', { name: /delete group/i })
      ).toBeInTheDocument();
    });

    it('displays "Leave Group" label for non-admin users', async () => {
      render(<GroupSettingsPanel group={group} isAdmin={false} />);

      expect(
        await screen.findByRole('button', { name: /leave group/i })
      ).toBeInTheDocument();
    });

    it('calls deleteOrLeaveGroup with mode "delete" for admins', async () => {
      vi.mocked(privateSpacesApi.deleteOrLeaveGroup).mockResolvedValueOnce(undefined);
      render(<GroupSettingsPanel group={group} isAdmin={true} />);

      fireEvent.click(screen.getByRole('button', { name: /delete group/i }));

      await waitFor(() => {
        expect(privateSpacesApi.deleteOrLeaveGroup).toHaveBeenCalledWith(1, 'delete');
      });
    });

    it('calls deleteOrLeaveGroup with mode "leave" for non-admins', async () => {
      vi.mocked(privateSpacesApi.deleteOrLeaveGroup).mockResolvedValueOnce(undefined);
      render(<GroupSettingsPanel group={group} isAdmin={false} />);

      fireEvent.click(screen.getByRole('button', { name: /leave group/i }));

      await waitFor(() => {
        expect(privateSpacesApi.deleteOrLeaveGroup).toHaveBeenCalledWith(1, 'leave');
      });
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

      render(<GroupSettingsPanel group={group} isAdmin={true} />);

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

      render(<GroupSettingsPanel group={group} isAdmin={true} />);

      expect(await screen.findByText('User #333')).toBeInTheDocument();
    });

    it('shows an error message if members fail to load', async () => {
      vi.mocked(privateSpacesApi.listGroupMembers).mockRejectedValueOnce(
        new Error('boom')
      );

      render(<GroupSettingsPanel group={group} isAdmin={true} />);

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

    it('falls back to the placeholder avatar when the participant has no avatar_url', async () => {
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

      expect(
        await screen.findByRole('img', { name: 'no_avatar_user' })
      ).toHaveAttribute('src', 'https://via.placeholder.com/150');
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
  });

  describe('PrivateSpacesPage', () => {
    it('loads the current user id via profileApi before rendering, then computes is_admin per group', async () => {
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

      expect(await screen.findByRole('button', { name: /delete group/i })).toBeInTheDocument();
    });
  });
});
