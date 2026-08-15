import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationFeed } from '../components/NotificationFeed';
import { notificationsApi, socketClient } from '../index';
import { profileApi } from '../../profile';
import { workspacesApi } from '../../workspaces';
import { privateSpacesApi } from '../../private_spaces';

vi.mock('../index', () => ({
  notificationsApi: {
    listNotifications: vi.fn(),
    markNotificationAsRead: vi.fn(),
  },
  socketClient: {
    onNewNotification: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../profile', () => ({
  profileApi: {
    listPublicProfilesByIds: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../workspaces', () => ({
  workspacesApi: {
    listChannels: vi.fn().mockResolvedValue([]),
    listTopics: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../private_spaces', () => ({
  privateSpacesApi: {
    getGroup: vi.fn(),
  },
}));

const notification = {
  notification_id: 1,
  event_type: 'NEW_MESSAGE',
  payload: { content: 'hello there', sender_id: 7 },
  is_read: false,
  created_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(profileApi.listPublicProfilesByIds).mockResolvedValue([]);
  vi.mocked(workspacesApi.listChannels).mockResolvedValue([]);
  vi.mocked(workspacesApi.listTopics).mockResolvedValue([]);
});

describe('NotificationFeed', () => {
  it('shows a loading state, then the list with a formatted event label', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([notification]);

    render(<NotificationFeed />);

    expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
    expect(await screen.findByText('hello there')).toBeInTheDocument();
    expect(screen.getByText(/New message/)).toBeInTheDocument();
  });

  it('shows an empty state with no notifications', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([]);

    render(<NotificationFeed />);

    expect(await screen.findByText('No notifications yet.')).toBeInTheDocument();
  });

  it('formats MESSAGE_DELETED and skips the raw JSON payload dump', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([
      { ...notification, event_type: 'MESSAGE_DELETED', payload: { base_message_id: 42 } },
    ]);

    render(<NotificationFeed />);

    expect(await screen.findByText(/Message deleted/)).toBeInTheDocument();
    expect(screen.queryByText('{"base_message_id":42}')).not.toBeInTheDocument();
  });

  it('resolves the sender username into the notification context', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([notification]);
    vi.mocked(profileApi.listPublicProfilesByIds).mockResolvedValueOnce([
      { user_id: 7, username: 'alice', display_name: 'Alice', avatar_url: null, bio: '' },
    ]);

    render(<NotificationFeed />);

    expect(await screen.findByText(/from alice/)).toBeInTheDocument();
  });

  it('resolves the group name into the notification context', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([
      { ...notification, payload: { content: 'hey team', sender_id: 7, group_id: 3 } },
    ]);
    vi.mocked(privateSpacesApi.getGroup).mockResolvedValueOnce({
      group_id: 3,
      name: 'Sprint Planning',
      creator_id: 1,
      created_at: '2026-01-01T00:00:00Z',
      invite_token: 'tok-sprint',
    });

    render(<NotificationFeed />);

    expect(await screen.findByText(/in Sprint Planning/)).toBeInTheDocument();
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
      pushLiveNotification({
        ...notification,
        notification_id: 2,
        payload: { content: 'live one', sender_id: 7 },
      });
    });

    expect(await screen.findByText('live one')).toBeInTheDocument();
  });

  it('removes the notification from the list once marked as read', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([notification]);
    vi.mocked(notificationsApi.markNotificationAsRead).mockResolvedValueOnce({
      ...notification,
      is_read: true,
    });

    render(<NotificationFeed />);
    await screen.findByText('hello there');

    fireEvent.click(screen.getByText('Mark as read'));

    await waitFor(() => expect(screen.queryByText('hello there')).not.toBeInTheDocument());
    expect(notificationsApi.markNotificationAsRead).toHaveBeenCalledWith(1, true);
  });

  it('does not show already-read notifications on initial load, even though the API returns them', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([
      { ...notification, notification_id: 2, is_read: true, payload: { content: 'old, already read' } },
      { ...notification, is_read: false },
    ]);

    render(<NotificationFeed />);

    expect(await screen.findByText('hello there')).toBeInTheDocument();
    expect(screen.queryByText('old, already read')).not.toBeInTheDocument();
  });

  it('keeps the notification removed locally even if persisting the read state fails', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([notification]);
    vi.mocked(notificationsApi.markNotificationAsRead).mockRejectedValueOnce(new Error('nope'));

    render(<NotificationFeed />);
    await screen.findByText('hello there');

    fireEvent.click(screen.getByText('Mark as read'));

    await waitFor(() => expect(screen.queryByText('hello there')).not.toBeInTheDocument());
  });
});
