import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileView } from '../components/ProfileView';
import { ProfilePage } from '../pages/ProfilePage';
import { profileApi } from '../index';

vi.mock('../index', () => ({
  profileApi: {
    getMyProfile: vi.fn(),
    updateProfile: vi.fn(),
    getPublicProfile: vi.fn(),
  },
}));

const mockProfile = {
  display_name: 'Test User',
  bio: 'This is a test bio.',
  avatar_url: 'https://via.placeholder.com/150',
  allow_group_invitations: true,
};

const mockUserProfile = {
  user_id: 1,
  username: 'testuser',
  display_name: 'Test User',
  bio: 'This is a test bio.',
  avatar_url: 'https://via.placeholder.com/150',
  allow_group_invitations: true,
};

describe('Profile Module (SCRUM-28)', () => {
  describe('ProfileView Component', () => {
    it('renders display_name, bio, and avatar_url properly', () => {
      render(<ProfileView profile={mockProfile} isOwnProfile={false} />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('This is a test bio.')).toBeInTheDocument();

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('src', 'https://via.placeholder.com/150');
    });

    it('DOES NOT render allow_group_invitations when isOwnProfile is false', () => {
      render(<ProfileView profile={mockProfile} isOwnProfile={false} />);

      expect(screen.queryByText(/allow group invitations/i)).not.toBeInTheDocument();
    });

    it('renders allow_group_invitations when isOwnProfile is true', () => {
      render(<ProfileView profile={mockProfile} isOwnProfile={true} />);

      expect(screen.getByText(/allow group invitations/i)).toBeInTheDocument();
    });
  });

  describe('ProfilePage (SCRUM-29 data wiring)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('renders a loading state first, then the fetched profile', async () => {
      vi.mocked(profileApi.getMyProfile).mockResolvedValueOnce(mockUserProfile);

      render(<ProfilePage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    it('renders an error state when the fetch rejects', async () => {
      vi.mocked(profileApi.getMyProfile).mockRejectedValueOnce(new Error('network error'));

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText(/couldn't load profile/i)).toBeInTheDocument();
      });
    });

    it('toggles between ProfileView and ProfileEditForm without reloading', async () => {
      vi.mocked(profileApi.getMyProfile).mockResolvedValueOnce(mockUserProfile);

      render(<ProfilePage />);

      const editButton = await screen.findByRole('button', { name: /edit/i });
      expect(editButton).toBeInTheDocument();

      fireEvent.click(editButton);

      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();

      fireEvent.click(cancelButton);
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });

    it('save flow calls updateProfile with the changed fields and reflects the update', async () => {
      vi.mocked(profileApi.getMyProfile).mockResolvedValueOnce(mockUserProfile);
      vi.mocked(profileApi.updateProfile).mockResolvedValueOnce({
        ...mockUserProfile,
        display_name: 'New Name',
      });

      render(<ProfilePage />);

      const editButton = await screen.findByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      const nameInput = screen.getByDisplayValue(mockUserProfile.display_name);
      fireEvent.change(nameInput, { target: { value: 'New Name' } });

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(profileApi.updateProfile).toHaveBeenCalledWith({
          display_name: 'New Name',
          bio: mockUserProfile.bio,
          allow_group_invitations: mockUserProfile.allow_group_invitations,
        });
      });

      expect(await screen.findByText('New Name')).toBeInTheDocument();
    });
  });
});
