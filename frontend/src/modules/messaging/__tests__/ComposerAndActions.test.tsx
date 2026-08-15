// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Composer } from '../components/Composer';
import { MessageActions } from '../components/MessageActions';
import { Message } from '../types';

describe('SCRUM-43 Messaging Components', () => {
  describe('Composer', () => {
    it('submits on Enter key press without Shift', () => {
      const handleSend = vi.fn();
      render(<Composer onSendMessage={handleSend} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(textarea, { target: { value: 'Hello world' } });
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: false });

      expect(handleSend).toHaveBeenCalledWith('Hello world');
      expect((textarea as HTMLTextAreaElement).value).toBe('');
    });

    it('does not submit on Shift + Enter', () => {
      const handleSend = vi.fn();
      render(<Composer onSendMessage={handleSend} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(textarea, { target: { value: 'Line 1' } });
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: true });

      expect(handleSend).not.toHaveBeenCalled();
    });

    it('blocks sending empty text when there is no attachment', () => {
      const handleSend = vi.fn();
      render(<Composer onSendMessage={handleSend} />);

      expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Send' }));

      expect(handleSend).not.toHaveBeenCalled();
    });

    it('allows sending empty text when hasAttachment is true (media-only message)', () => {
      const handleSend = vi.fn();
      render(<Composer onSendMessage={handleSend} hasAttachment />);

      expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
      fireEvent.click(screen.getByRole('button', { name: 'Send' }));

      expect(handleSend).toHaveBeenCalledWith('');
    });
  });

  describe('MessageActions Permissions', () => {
    const mockMessage: Message = {
      base_message_id: 1,
      sender_id: 1,
      sender_username: 'sender',
      content: 'Original Message',
      sent_at: '2026-01-01T00:00:00Z',
      is_edited: false,
    };

    it('renders Edit and Delete controls when user is the sender', () => {
      render(
        <MessageActions
          message={mockMessage}
          currentUserId={1}
          hasDeletePermission={false}
          onEditMessage={vi.fn()}
          onDeleteMessage={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /edit message/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete message/i })).toBeInTheDocument();
    });

    it('never renders Edit control for non-sender, even if hasDeletePermission is true', () => {
      render(
        <MessageActions
          message={mockMessage}
          currentUserId={2}
          hasDeletePermission={true}
          onEditMessage={vi.fn()}
          onDeleteMessage={vi.fn()}
        />
      );

      expect(screen.queryByRole('button', { name: /edit message/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete message/i })).toBeInTheDocument();
    });

    it('calls onDeleteMessage when Delete button is clicked', () => {
      const handleDelete = vi.fn();
      render(
        <MessageActions
          message={mockMessage}
          currentUserId={1}
          onEditMessage={vi.fn()}
          onDeleteMessage={handleDelete}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /delete message/i }));
      expect(handleDelete).toHaveBeenCalledWith(1);
    });
  });
});