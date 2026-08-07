import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';
import { profileApi } from '../modules/profile';

vi.mock('../modules/profile', () => ({
  profileApi: {
    getMyProfile: vi.fn(),
    updateProfile: vi.fn(),
    getPublicProfile: vi.fn(),
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
});