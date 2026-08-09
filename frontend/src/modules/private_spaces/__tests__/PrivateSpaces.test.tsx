import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DirectMessageList } from '../components/DirectMessageList';
import { GroupList } from '../components/GroupList';
import { GroupSettingsPanel } from '../components/GroupSettingsPanel';
import { InvitationList } from '../components/InvitationList';

describe('Private Spaces UI Components (SCRUM-34)', () => {
  describe('InvitationList', () => {
    it('removes invitation immediately on accept/decline', () => {
      render(<InvitationList />);

      expect(screen.getByText('Backend Devs')).toBeInTheDocument();
      const acceptButtons = screen.getAllByRole('button', { name: /accept/i });

      // Click Accept on first invitation
      fireEvent.click(acceptButtons[0]);

      expect(screen.queryByText('Backend Devs')).not.toBeInTheDocument();
    });
  });

  describe('GroupSettingsPanel', () => {
    it('displays "Delete Group" label for admin users', () => {
      const adminGroup = { id: '1', name: 'Admin Room', is_admin: true, member_count: 2 };
      render(<GroupSettingsPanel group={adminGroup} />);

      expect(screen.getByRole('button', { name: /delete group/i })).toBeInTheDocument();
    });

    it('displays "Leave Group" label for non-admin users', () => {
      const memberGroup = { id: '2', name: 'Member Room', is_admin: false, member_count: 5 };
      render(<GroupSettingsPanel group={memberGroup} />);

      expect(screen.getByRole('button', { name: /leave group/i })).toBeInTheDocument();
    });
  });

  describe('DirectMessageList & GroupList', () => {
    it('renders list items and allows creating new DM', () => {
      render(<DirectMessageList />);
      
      fireEvent.click(screen.getByRole('button', { name: /start new dm/i }));
      const input = screen.getByPlaceholderText(/enter username.../i);
      fireEvent.change(input, { target: { value: 'test_user' } });
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }));

      expect(screen.getByText('@test_user')).toBeInTheDocument();
    });

    it('renders groups and allows creating a new group', () => {
      render(<GroupList />);

      fireEvent.click(screen.getByRole('button', { name: /create group/i }));
      const input = screen.getByPlaceholderText(/group name/i);
      fireEvent.change(input, { target: { value: 'New Test Group' } });
      fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

      expect(screen.getByText('New Test Group')).toBeInTheDocument();
    });
  });
});