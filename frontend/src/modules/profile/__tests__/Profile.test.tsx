import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProfileView } from '../components/ProfileView';
import { ProfilePage } from '../pages/ProfilePage';

const mockProfile = {
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

  describe('ProfilePage Master Layout', () => {
    it('toggles between ProfileView and ProfileEditForm without reloading', () => {
      render(<ProfilePage />);

      const editButton = screen.getByRole('button', { name: /edit/i });
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
  });
});