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
  },
}));

const currentUserId = 111;

describe('Private Spaces (SCRUM-35 network wiring)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('InvitationList', () => {
    it('fetches invitations, resolves group names, and removes on accept/decline', async () => {
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
      vi.mocked(privateSpacesApi.respondToInvitation).mockResolvedValueOnce({
        invitation_id: 1,
        status: 'ACCEPTED',
      });

      render(<InvitationList />);

      expect(await screen.findByText('Backend Devs')).toBeInTheDocument();
      expect(screen.getByText('From User #500')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /accept/i }));

      await waitFor(() => {
        expect(privateSpacesApi.respondToInvitation).toHaveBeenCalledWith(1, 'ACCEPTED');
      });
      await waitFor(() => {
        expect(screen.queryByText('Backend Devs')).not.toBeInTheDocument();
      });
    });
  });

  describe('GroupSettingsPanel', () => {
    const group = {
      group_id: 1,
      name: 'Admin Room',
      creator_id: currentUserId,
      created_at: '2026-01-01T00:00:00Z',
    };

    it('displays "Delete Group" label for admin users', () => {
      render(<GroupSettingsPanel group={group} isAdmin={true} />);

      expect(screen.getByRole('button', { name: /delete group/i })).toBeInTheDocument();
    });

    it('displays "Leave Group" label for non-admin users', () => {
      render(<GroupSettingsPanel group={group} isAdmin={false} />);

      expect(screen.getByRole('button', { name: /leave group/i })).toBeInTheDocument();
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
  });

  describe('DirectMessageList', () => {
    it('renders fetched DMs with the honest "User #id" fallback', async () => {
      vi.mocked(privateSpacesApi.listDirectChats).mockResolvedValueOnce([
        { direct_chat_id: 1, user1_id: currentUserId, user2_id: 777, created_at: '2026-01-01T00:00:00Z' },
      ]);

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
    it('renders fetched groups without a member count and allows creating a new group', async () => {
      vi.mocked(privateSpacesApi.listGroups).mockResolvedValueOnce([
        { group_id: 1, name: 'Frontend Team', creator_id: currentUserId, created_at: '2026-01-01T00:00:00Z' },
      ]);
      vi.mocked(privateSpacesApi.createGroup).mockResolvedValueOnce({
        group_id: 2,
        name: 'New Test Group',
        creator_id: currentUserId,
        created_at: '2026-01-01T00:00:00Z',
      });

      render(<GroupList />);

      expect(await screen.findByText('Frontend Team')).toBeInTheDocument();
      expect(screen.queryByText(/members\)/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /create group/i }));
      const input = screen.getByPlaceholderText(/group name/i);
      fireEvent.change(input, { target: { value: 'New Test Group' } });
      fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

      expect(await screen.findByText('New Test Group')).toBeInTheDocument();
      expect(privateSpacesApi.createGroup).toHaveBeenCalledWith('New Test Group');
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
