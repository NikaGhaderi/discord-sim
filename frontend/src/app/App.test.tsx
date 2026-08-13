import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from './App';
import { profileApi } from '../modules/profile';
import { privateSpacesApi } from '../modules/private_spaces';
import { workspacesApi } from '../modules/workspaces';
import { messagingApi } from '../modules/messaging';
import { identityApi } from '../modules/identity';

vi.mock('../modules/identity', async () => {
  const actual = await vi.importActual<typeof import('../modules/identity/types')>(
    '../modules/identity/types'
  );
  return {
    ...actual,
    identityApi: {
      registerUser: vi.fn(),
      loginUser: vi.fn(),
      verify2FA: vi.fn(),
      logoutUser: vi.fn(),
      requestPasswordReset: vi.fn(),
      confirmPasswordReset: vi.fn(),
    },
  };
});

vi.mock('../modules/profile', () => ({
  profileApi: {
    getMyProfile: vi.fn(),
    updateProfile: vi.fn(),
    getPublicProfile: vi.fn(),
    listPublicProfilesByIds: vi.fn(),
  },
}));

vi.mock('../modules/private_spaces', () => ({
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

vi.mock('../modules/workspaces', () => ({
  workspacesApi: {
    listChannels: vi.fn(),
    getChannel: vi.fn(),
    createChannel: vi.fn(),
    updateChannel: vi.fn(),
    deleteChannel: vi.fn(),
    joinChannel: vi.fn(),
    joinChannelByInviteToken: vi.fn(),
    leaveChannel: vi.fn(),
    listMembers: vi.fn(),
    getMyPermissions: vi.fn().mockResolvedValue([]),
    updateMemberNickname: vi.fn(),
    kickMember: vi.fn(),
    listRoles: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    assignRole: vi.fn(),
    listTopics: vi.fn().mockResolvedValue([]),
    getTopic: vi.fn(),
    createTopic: vi.fn(),
    deleteTopic: vi.fn(),
  },
}));

vi.mock('../modules/messaging', () => ({
  messagingApi: {
    sendMessage: vi.fn(),
    listMessages: vi.fn(),
    editMessage: vi.fn(),
    deleteMessage: vi.fn(),
    attachMedia: vi.fn(),
    searchMessages: vi.fn(),
    createScheduledMessage: vi.fn(),
    cancelScheduledMessage: vi.fn(),
    listScheduledMessages: vi.fn(),
  },
}));

describe('App Component', () => {
  test('renders login form by default on root path', () => {
    render(<App />);
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
  });

  test('after registering, redirects to /workspaces and shows the persistent nav', async () => {
    vi.mocked(identityApi.registerUser).mockResolvedValueOnce({
      user_id: 1,
      username: 'new_user',
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    vi.mocked(workspacesApi.listChannels).mockResolvedValueOnce([]);
    vi.mocked(profileApi.getMyProfile).mockResolvedValueOnce({
      user_id: 1,
      username: 'new_user',
      display_name: 'New User',
      avatar_url: null,
      bio: '',
      allow_group_invitations: true,
    });

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'new_user' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'new_user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'StrongPassw0rd!' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'StrongPassw0rd!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));

    await waitFor(() => expect(identityApi.registerUser).toHaveBeenCalled());
    expect(await screen.findByText('Select or create a channel to get started.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Workspaces' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Direct Messages' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
  });

  test('renders profile page when navigated to /profile', async () => {
    vi.mocked(profileApi.getMyProfile).mockResolvedValueOnce({
      user_id: 1,
      username: 'ftm_roosta',
      display_name: 'Fatemeh Roosta',
      avatar_url: 'https://via.placeholder.com/150',
      bio: 'Frontend developer working on Discord Sim.',
      allow_group_invitations: true,
    });
    window.history.pushState({}, 'Profile Page', '/profile');
    render(<App />);

    expect(await screen.findByText(/Fatemeh Roosta/i)).toBeInTheDocument();
  });

  test('renders the private spaces page when navigated to /private-spaces', async () => {
    vi.mocked(profileApi.getMyProfile).mockResolvedValueOnce({
      user_id: 1,
      username: 'ftm_roosta',
      display_name: 'Fatemeh Roosta',
      avatar_url: 'https://via.placeholder.com/150',
      bio: 'Frontend developer working on Discord Sim.',
      allow_group_invitations: true,
    });
    vi.mocked(privateSpacesApi.listDirectChats).mockResolvedValueOnce([]);
    vi.mocked(privateSpacesApi.listGroups).mockResolvedValueOnce([]);
    vi.mocked(privateSpacesApi.listMyInvitations).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    window.history.pushState({}, 'Private Spaces Page', '/private-spaces');

    render(<App />);

    expect(await screen.findByText('Direct Messages')).toBeInTheDocument();
    expect(screen.getByText('Groups')).toBeInTheDocument();
  });

  test('renders the workspaces page when navigated to /workspaces', async () => {
    vi.mocked(workspacesApi.listChannels).mockResolvedValueOnce([
      {
        channel_id: 1,
        name: 'general',
        creator_id: 9,
        default_topic_id: 5,
        created_at: '2026-01-01T00:00:00Z',
        invite_token: 'abc123',
      },
    ]);
    vi.mocked(profileApi.getMyProfile).mockResolvedValueOnce({
      user_id: 1,
      username: 'ftm_roosta',
      display_name: 'Fatemeh Roosta',
      avatar_url: 'https://via.placeholder.com/150',
      bio: 'Frontend developer working on Discord Sim.',
      allow_group_invitations: true,
    });
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    window.history.pushState({}, 'Workspaces Page', '/workspaces');

    render(<App />);

    expect(await screen.findAllByText('# general')).not.toHaveLength(0);
  });
});