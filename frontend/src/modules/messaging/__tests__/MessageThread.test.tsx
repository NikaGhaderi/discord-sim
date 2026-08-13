import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageThread } from '../components/MessageThread';
import { socketClient } from '../../notifications';
import { messagingApi } from '../index';
import { Message } from '../types';

vi.mock('../../notifications', () => ({
  socketClient: {
    subscribe: vi.fn(),
    onNewMessage: vi.fn(() => vi.fn()),
    onMessageDeleted: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../index', async () => {
  const actual = await vi.importActual<typeof import('../types')>('../types');
  return {
    ...actual,
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
  };
});

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    base_message_id: 1,
    sender_id: 1,
    sender_username: 'nika_lead',
    content: 'hello',
    sent_at: '12:34 PM',
    is_edited: false,
    media: [],
    ...overrides,
  };
}

function page(results: Message[], count = results.length) {
  return { count, next: null, previous: null, results };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(socketClient.onNewMessage).mockReturnValue(vi.fn());
  vi.mocked(socketClient.onMessageDeleted).mockReturnValue(vi.fn());
});

describe('MessageThread', () => {
  it('renders nothing and never fetches when no topicId is passed', () => {
    render(<MessageThread />);

    expect(messagingApi.listMessages).not.toHaveBeenCalled();
    expect(socketClient.subscribe).not.toHaveBeenCalled();
  });

  it('fetches once when the total count fits in a single page', async () => {
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce(
      page([makeMessage({ base_message_id: 1, content: 'only message' })])
    );

    render(<MessageThread topicId={7} />);

    expect(await screen.findByText('only message')).toBeInTheDocument();
    expect(messagingApi.listMessages).toHaveBeenCalledTimes(1);
    expect(messagingApi.listMessages).toHaveBeenCalledWith({ topic_id: 7 }, 20, 0);
    expect(screen.getByText('Beginning of message history')).toBeInTheDocument();
  });

  it('fetches the true latest page when history exceeds one page', async () => {
    // First call only learns the count; second call fetches the actual tail.
    vi.mocked(messagingApi.listMessages)
      .mockResolvedValueOnce(page([], 45))
      .mockResolvedValueOnce(
        page(
          [makeMessage({ base_message_id: 45, content: 'the latest message' })],
          45
        )
      );

    render(<MessageThread topicId={7} />);

    expect(await screen.findByText('the latest message')).toBeInTheDocument();
    expect(messagingApi.listMessages).toHaveBeenNthCalledWith(1, { topic_id: 7 }, 20, 0);
    expect(messagingApi.listMessages).toHaveBeenNthCalledWith(2, { topic_id: 7 }, 20, 25);
    expect(screen.queryByText('Beginning of message history')).not.toBeInTheDocument();
  });

  it('loads an older page when scrolled to the top, preserving order', async () => {
    vi.mocked(messagingApi.listMessages)
      .mockResolvedValueOnce(page([], 40))
      .mockResolvedValueOnce(page([makeMessage({ base_message_id: 40, content: 'recent' })], 40))
      .mockResolvedValueOnce(page([makeMessage({ base_message_id: 20, content: 'older' })], 40));

    render(<MessageThread topicId={7} />);
    expect(await screen.findByText('recent')).toBeInTheDocument();

    const scrollContainer = screen.getByTestId('message-thread-scroll');
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 0 } });

    expect(await screen.findByText('older')).toBeInTheDocument();
    expect(messagingApi.listMessages).toHaveBeenNthCalledWith(3, { topic_id: 7 }, 20, 0);
    expect(screen.getByText('Beginning of message history')).toBeInTheDocument();
  });

  it('subscribes to the right topic group when topicId is passed', async () => {
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce(page([]));

    render(<MessageThread topicId={7} />);

    await waitFor(() => expect(messagingApi.listMessages).toHaveBeenCalled());
    expect(socketClient.subscribe).toHaveBeenCalledWith('topic_7');
  });

  it('appends a live NEW_MESSAGE to the bottom of the thread', async () => {
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce(page([]));
    let deliverNewMessage: (data: unknown) => void = () => {};
    vi.mocked(socketClient.onNewMessage).mockImplementation((handler) => {
      deliverNewMessage = handler as never;
      return vi.fn();
    });

    render(<MessageThread topicId={7} />);
    await waitFor(() => expect(messagingApi.listMessages).toHaveBeenCalled());

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

  it('does not duplicate a message the live push echoes back after a successful send', async () => {
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce(page([]));
    const sent = makeMessage({ base_message_id: 55, content: 'my own message' });
    vi.mocked(messagingApi.sendMessage).mockResolvedValueOnce(sent);
    let deliverNewMessage: (data: unknown) => void = () => {};
    vi.mocked(socketClient.onNewMessage).mockImplementation((handler) => {
      deliverNewMessage = handler as never;
      return vi.fn();
    });

    render(<MessageThread topicId={7} currentUserId={1} />);
    await waitFor(() => expect(messagingApi.listMessages).toHaveBeenCalled());

    const textarea = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(textarea, { target: { value: 'my own message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByText('my own message')).toBeInTheDocument();

    // The realtime notifier also pushes the sender's own message back over
    // the socket -- this must not create a second entry.
    act(() => {
      deliverNewMessage({
        base_message_id: 55,
        sender_id: 1,
        content: 'my own message',
        sent_at: sent.sent_at,
        is_edited: false,
        media: [],
      });
    });

    expect(screen.getAllByText('my own message')).toHaveLength(1);
  });

  it('removes a message from the thread on a live MESSAGE_DELETED event', async () => {
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce(
      page([makeMessage({ base_message_id: 20, content: 'will be deleted' })])
    );
    let deliverDeleted: (data: unknown) => void = () => {};
    vi.mocked(socketClient.onMessageDeleted).mockImplementation((handler) => {
      deliverDeleted = handler as never;
      return vi.fn();
    });

    render(<MessageThread topicId={7} />);
    expect(await screen.findByText('will be deleted')).toBeInTheDocument();

    act(() => {
      deliverDeleted({ base_message_id: 20 });
    });

    await waitFor(() =>
      expect(screen.queryByText('will be deleted')).not.toBeInTheDocument()
    );
  });

  it('unsubscribes from live updates on unmount', async () => {
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce(page([]));
    const unsubscribeNewMessage = vi.fn();
    const unsubscribeDeleted = vi.fn();
    vi.mocked(socketClient.onNewMessage).mockReturnValue(unsubscribeNewMessage);
    vi.mocked(socketClient.onMessageDeleted).mockReturnValue(unsubscribeDeleted);

    const { unmount } = render(<MessageThread topicId={7} />);
    await waitFor(() => expect(messagingApi.listMessages).toHaveBeenCalled());
    unmount();

    expect(unsubscribeNewMessage).toHaveBeenCalledTimes(1);
    expect(unsubscribeDeleted).toHaveBeenCalledTimes(1);
  });

  it('sends a message via the composer', async () => {
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce(page([]));
    vi.mocked(messagingApi.sendMessage).mockResolvedValueOnce(
      makeMessage({ base_message_id: 2, content: 'typed message' })
    );

    render(<MessageThread topicId={7} currentUserId={1} />);
    await waitFor(() => expect(messagingApi.listMessages).toHaveBeenCalled());

    const textarea = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(textarea, { target: { value: 'typed message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

    expect(messagingApi.sendMessage).toHaveBeenCalledWith({
      topic_id: 7,
      content: 'typed message',
    });
    expect(await screen.findByText('typed message')).toBeInTheDocument();
  });

  it('edits a message via MessageActions and reflects the update', async () => {
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce(
      page([makeMessage({ base_message_id: 3, sender_id: 1, content: 'original' })])
    );
    vi.mocked(messagingApi.editMessage).mockResolvedValueOnce(
      makeMessage({ base_message_id: 3, sender_id: 1, content: 'edited', is_edited: true })
    );

    render(<MessageThread topicId={7} currentUserId={1} />);
    expect(await screen.findByText('original')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit message/i }));
    const editInput = screen.getByDisplayValue('original');
    fireEvent.change(editInput, { target: { value: 'edited' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(messagingApi.editMessage).toHaveBeenCalledWith(3, 'edited');
    expect(await screen.findByText('edited')).toBeInTheDocument();
  });

  it('deletes a message via MessageActions and removes it immediately', async () => {
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce(
      page([makeMessage({ base_message_id: 4, sender_id: 1, content: 'to remove' })])
    );
    vi.mocked(messagingApi.deleteMessage).mockResolvedValueOnce(undefined);

    render(<MessageThread topicId={7} currentUserId={1} />);
    expect(await screen.findByText('to remove')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /delete message/i }));

    expect(messagingApi.deleteMessage).toHaveBeenCalledWith(4);
    await waitFor(() => expect(screen.queryByText('to remove')).not.toBeInTheDocument());
  });

  it('never renders edit/delete controls for a message sent by someone else', async () => {
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce(
      page([makeMessage({ base_message_id: 5, sender_id: 99, content: 'not mine' })])
    );

    render(<MessageThread topicId={7} currentUserId={1} />);
    expect(await screen.findByText('not mine')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /edit message/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete message/i })).not.toBeInTheDocument();
  });

  it('attaches the selected file after sending a message', async () => {
    vi.mocked(messagingApi.listMessages).mockResolvedValueOnce(page([]));
    const sent = makeMessage({ base_message_id: 6, content: 'with attachment' });
    vi.mocked(messagingApi.sendMessage).mockResolvedValueOnce(sent);
    vi.mocked(messagingApi.attachMedia).mockResolvedValueOnce({
      media_id: 1,
      base_message_id: 6,
      file_url: '/media/a.png',
      file_type: 'image/png',
      file_size: 10,
      thumbnail_url: null,
    });

    render(<MessageThread topicId={7} currentUserId={1} />);
    await waitFor(() => expect(messagingApi.listMessages).toHaveBeenCalled());

    const file = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('media-file-input'), { target: { files: [file] } });

    const textarea = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(textarea, { target: { value: 'with attachment' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

    await waitFor(() =>
      expect(messagingApi.attachMedia).toHaveBeenCalledWith(6, file)
    );
    expect(await screen.findByText('a.png')).toBeInTheDocument();
  });
});
