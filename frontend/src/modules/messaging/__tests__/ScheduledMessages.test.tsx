// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Composer } from '../components/Composer';
import { ScheduledMessagesList } from '../components/ScheduledMessagesList';
import { mockMessagingApi } from '../mockApi';
import { ScheduledMessage } from '../api';

describe('SCRUM-53 Scheduled Messages UI', () => {
  describe('Composer Schedule Picker', () => {
    it('renders datetime-local input with min attribute set to current time', () => {
      render(<Composer onSendMessage={vi.fn()} onScheduleMessage={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: /toggle schedule/i }));

      const dateInput = screen.getByTestId('schedule-datetime-input') as HTMLInputElement;
      expect(dateInput).toBeInTheDocument();
      expect(dateInput.type).toBe('datetime-local');
      expect(dateInput.min).toBeTruthy();
    });

    it('submits scheduled message when datetime is selected', () => {
      const handleSchedule = vi.fn();
      render(<Composer onSendMessage={vi.fn()} onScheduleMessage={handleSchedule} />);

      fireEvent.click(screen.getByRole('button', { name: /toggle schedule/i }));

      const textarea = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(textarea, { target: { value: 'Future message' } });

      const dateInput = screen.getByTestId('schedule-datetime-input');
      fireEvent.change(dateInput, { target: { value: '2030-01-01T10:00' } });

      fireEvent.click(screen.getByRole('button', { name: /^schedule$/i }));

      expect(handleSchedule).toHaveBeenCalledWith('Future message', '2030-01-01T10:00');
    });
  });

  describe('ScheduledMessagesList & Mock API Parity', () => {
    const mockList: ScheduledMessage[] = [
      {
        scheduled_id: 1,
        topic_id: 5,
        content: 'Scheduled test message',
        scheduled_time: '2030-01-01T10:00:00Z',
      },
    ];

    it('renders pending scheduled messages and allows cancellation', () => {
      const handleCancel = vi.fn();
      render(
        <ScheduledMessagesList
          scheduledMessages={mockList}
          onCancelScheduledMessage={handleCancel}
        />
      );

      expect(screen.getByText('Scheduled test message')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /cancel scheduled message/i }));
      expect(handleCancel).toHaveBeenCalledWith(1);
    });

    it('removes scheduled message immediately via mockApi', async () => {
      const created = await mockMessagingApi.createScheduledMessage({
        topic_id: 5,
        content: 'To be cancelled',
        scheduled_time: '2030-05-01T12:00:00Z',
      });

      let list = await mockMessagingApi.listScheduledMessages({ topic_id: 5 });
      expect(list.some((s) => s.scheduled_id === created.scheduled_id)).toBe(true);

      await mockMessagingApi.cancelScheduledMessage(created.scheduled_id);

      list = await mockMessagingApi.listScheduledMessages({ topic_id: 5 });
      expect(list.some((s) => s.scheduled_id === created.scheduled_id)).toBe(false);

      const threadMessages = await mockMessagingApi.listMessages({ topic_id: 5 });
      expect(threadMessages.results.some((m) => m.content === 'To be cancelled')).toBe(false);
    });
  });
});