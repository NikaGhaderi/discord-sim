import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';
import { profileApi } from '../modules/profile';
import { privateSpacesApi } from '../modules/private_spaces';

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

describe('App Component', () => {
  test('renders login form by default on root path', () => {
    render(<App />);
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
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

  test('renders the channel thread page when navigated to /channels/demo', () => {
    window.history.pushState({}, 'Channel Thread Page', '/channels/demo');
    render(<App />);

    expect(screen.getByText('# general')).toBeInTheDocument();
    expect(screen.getByText('Message content #1')).toBeInTheDocument();
  });
});