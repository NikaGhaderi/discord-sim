import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScheduledMessagesPanel } from '../components/ScheduledMessagesPanel';
import { messagingApi } from '../index';

vi.mock('../index', async () => {
  const actual = await vi.importActual<typeof import('../types')>('../types');
  return {
    ...actual,
    messagingApi: {
      listScheduledMessages: vi.fn(),
      cancelScheduledMessage: vi.fn(),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ScheduledMessagesPanel', () => {
  it('fetches and renders the pending scheduled messages for the given target', async () => {
    vi.mocked(messagingApi.listScheduledMessages).mockResolvedValueOnce([
      { scheduled_id: 1, content: 'standup', scheduled_time: '2030-01-01T10:00:00Z', topic_id: 5 },
    ]);

    render(<ScheduledMessagesPanel target={{ topic_id: 5 }} />);

    expect(await screen.findByText('standup')).toBeInTheDocument();
    expect(messagingApi.listScheduledMessages).toHaveBeenCalledWith({ topic_id: 5 });
  });

  it('cancels a scheduled message and removes it from the list immediately', async () => {
    vi.mocked(messagingApi.listScheduledMessages).mockResolvedValueOnce([
      { scheduled_id: 2, content: 'cancel me', scheduled_time: '2030-01-01T10:00:00Z', topic_id: 5 },
    ]);
    vi.mocked(messagingApi.cancelScheduledMessage).mockResolvedValueOnce(undefined);

    render(<ScheduledMessagesPanel target={{ topic_id: 5 }} />);
    expect(await screen.findByText('cancel me')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel scheduled message/i }));

    expect(messagingApi.cancelScheduledMessage).toHaveBeenCalledWith(2);
    await waitFor(() => expect(screen.queryByText('cancel me')).not.toBeInTheDocument());
  });

  it('shows an empty state when there are no pending scheduled messages', async () => {
    vi.mocked(messagingApi.listScheduledMessages).mockResolvedValueOnce([]);

    render(<ScheduledMessagesPanel target={{ topic_id: 5 }} />);

    expect(await screen.findByText('No pending scheduled messages.')).toBeInTheDocument();
  });
});
