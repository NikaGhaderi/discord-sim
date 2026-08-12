import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationFeed } from '../components/NotificationFeed';
import { notificationsApi, socketClient } from '../index';

vi.mock('../index', () => ({
  notificationsApi: {
    listNotifications: vi.fn(),
    markNotificationAsRead: vi.fn(),
  },
  socketClient: {
    onNewNotification: vi.fn(() => vi.fn()),
  },
}));

const notification = {
  notification_id: 1,
  event_type: 'NEW_MESSAGE',
  payload: { content: 'hello there' },
  is_read: false,
  created_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NotificationFeed', () => {
  it('shows a loading state, then the list', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([notification]);

    render(<NotificationFeed />);

    expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
    expect(await screen.findByText('hello there')).toBeInTheDocument();
    expect(screen.getByText(/NEW_MESSAGE/)).toBeInTheDocument();
  });

  it('shows an empty state with no notifications', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([]);

    render(<NotificationFeed />);

    expect(await screen.findByText('No notifications yet.')).toBeInTheDocument();
  });

  it('falls back to a JSON dump when the payload has no content field', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([
      { ...notification, payload: { base_message_id: 42 } },
    ]);

    render(<NotificationFeed />);

    expect(await screen.findByText('{"base_message_id":42}')).toBeInTheDocument();
  });

  it('subscribes to live NEW_NOTIFICATION events and prepends them', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([]);
    let pushLiveNotification: (n: typeof notification) => void = () => {};
    vi.mocked(socketClient.onNewNotification).mockImplementation((handler) => {
      pushLiveNotification = handler as never;
      return vi.fn();
    });

    render(<NotificationFeed />);
    await screen.findByText('No notifications yet.');

    act(() => {
      pushLiveNotification({ ...notification, notification_id: 2, payload: { content: 'live one' } });
    });

    expect(await screen.findByText('live one')).toBeInTheDocument();
  });

  it('marks a notification read optimistically, hiding the button', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([notification]);
    vi.mocked(notificationsApi.markNotificationAsRead).mockResolvedValueOnce({
      ...notification,
      is_read: true,
    });

    render(<NotificationFeed />);
    await screen.findByText('hello there');

    fireEvent.click(screen.getByText('Mark as read'));

    await waitFor(() => expect(screen.queryByText('Mark as read')).not.toBeInTheDocument());
    expect(notificationsApi.markNotificationAsRead).toHaveBeenCalledWith(1, true);
  });

  it('rolls back the optimistic read state if the request fails', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([notification]);
    vi.mocked(notificationsApi.markNotificationAsRead).mockRejectedValueOnce(new Error('nope'));

    render(<NotificationFeed />);
    await screen.findByText('hello there');

    fireEvent.click(screen.getByText('Mark as read'));

    await waitFor(() => expect(screen.getByText('Mark as read')).toBeInTheDocument());
  });
});
