import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageThread } from '../components/MessageThread';
import { socketClient } from '../../notifications';

vi.mock('../../notifications', () => ({
  socketClient: {
    subscribe: vi.fn(),
    onNewMessage: vi.fn(() => vi.fn()),
    onMessageDeleted: vi.fn(() => vi.fn()),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(socketClient.onNewMessage).mockReturnValue(vi.fn());
  vi.mocked(socketClient.onMessageDeleted).mockReturnValue(vi.fn());
});

describe('MessageThread (SCRUM-42)', () => {
  it('renders the initial page of messages, tagging only the edited ones', () => {
    render(<MessageThread />);

    expect(screen.getByText('Message content #20')).toBeInTheDocument();
    expect(screen.getByText('Message content #1')).toBeInTheDocument();

    // Message #18 is a multiple of 3 (is_edited) -- #19 isn't.
    const edited = screen.getByText('Message content #18').closest('div')!;
    const notEdited = screen.getByText('Message content #19').closest('div')!;
    expect(within(edited).getByText('(edited)')).toBeInTheDocument();
    expect(within(notEdited).queryByText('(edited)')).not.toBeInTheDocument();

    // Older messages haven't loaded yet.
    expect(screen.queryByText('Message content #21')).not.toBeInTheDocument();
  });

  it('loads the next page of older messages when scrolled to the top', async () => {
    render(<MessageThread />);

    const scrollContainer = screen.getByTestId('message-thread-scroll');
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 0 } });

    expect(screen.getByText('Loading older messages...')).toBeInTheDocument();

    await waitFor(
      () => expect(screen.getByText('Message content #21')).toBeInTheDocument(),
      { timeout: 2000 }
    );
    expect(screen.getByText('Message content #40')).toBeInTheDocument();
  });

  it('stops offering more pages once the full mock history has loaded', async () => {
    render(<MessageThread />);
    const scrollContainer = screen.getByTestId('message-thread-scroll');

    // 60 mock messages, 20 per page, 20 already shown initially -> 2 more loads to exhaust.
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 0 } });
    await waitFor(() => expect(screen.getByText('Message content #40')).toBeInTheDocument(), {
      timeout: 2000,
    });

    fireEvent.scroll(scrollContainer, { target: { scrollTop: 0 } });
    await waitFor(() => expect(screen.getByText('Message content #60')).toBeInTheDocument(), {
      timeout: 2000,
    });
    expect(screen.getByText('Beginning of message history')).toBeInTheDocument();
  });

  it('does not subscribe to live updates when no topicId is passed (unchanged SCRUM-42 behavior)', () => {
    render(<MessageThread />);
    expect(socketClient.subscribe).not.toHaveBeenCalled();
  });

  it('subscribes to the right topic group when topicId is passed', () => {
    render(<MessageThread topicId={7} />);
    expect(socketClient.subscribe).toHaveBeenCalledWith('topic_7');
  });

  it('appends a live NEW_MESSAGE to the bottom of the thread', async () => {
    let deliverNewMessage: (data: unknown) => void = () => {};
    vi.mocked(socketClient.onNewMessage).mockImplementation((handler) => {
      deliverNewMessage = handler as never;
      return vi.fn();
    });

    render(<MessageThread topicId={7} />);

    act(() => {
      deliverNewMessage({
        base_message_id: 999,
        sender_id: 42,
        content: 'a brand new live message',
        sent_at: '2026-01-01T00:00:00Z',
        is_edited: false,
        media: [],
      });
    });

    expect(await screen.findByText('a brand new live message')).toBeInTheDocument();
    expect(screen.getByText('User #42')).toBeInTheDocument();
  });

  it('removes a message from the thread on a live MESSAGE_DELETED event', async () => {
    let deliverDeleted: (data: unknown) => void = () => {};
    vi.mocked(socketClient.onMessageDeleted).mockImplementation((handler) => {
      deliverDeleted = handler as never;
      return vi.fn();
    });

    render(<MessageThread topicId={7} />);
    expect(screen.getByText('Message content #20')).toBeInTheDocument();

    act(() => {
      deliverDeleted({ base_message_id: 20 });
    });

    await waitFor(() => expect(screen.queryByText('Message content #20')).not.toBeInTheDocument());
  });

  it('unsubscribes from live updates on unmount', () => {
    const unsubscribeNewMessage = vi.fn();
    const unsubscribeDeleted = vi.fn();
    vi.mocked(socketClient.onNewMessage).mockReturnValue(unsubscribeNewMessage);
    vi.mocked(socketClient.onMessageDeleted).mockReturnValue(unsubscribeDeleted);

    const { unmount } = render(<MessageThread topicId={7} />);
    unmount();

    expect(unsubscribeNewMessage).toHaveBeenCalledTimes(1);
    expect(unsubscribeDeleted).toHaveBeenCalledTimes(1);
  });
});
