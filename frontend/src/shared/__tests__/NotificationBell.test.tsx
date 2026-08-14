import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NotificationBell } from '../components/NotificationBell';
import { notificationsApi, socketClient, NewNotificationData } from '../../modules/notifications';

vi.mock('../../modules/notifications', () => ({
  notificationsApi: {
    listNotifications: vi.fn().mockResolvedValue([]),
    markNotificationAsRead: vi.fn(),
  },
  socketClient: {
    onNewNotification: vi.fn(() => vi.fn()),
  },
}));

describe('NotificationBell', () => {
  it('shows an unread count badge from the initial fetch', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([
      { notification_id: 1, event_type: 'NEW_MESSAGE', payload: {}, is_read: false, created_at: '2026-01-01T00:00:00Z' },
      { notification_id: 2, event_type: 'NEW_MESSAGE', payload: {}, is_read: true, created_at: '2026-01-01T00:00:00Z' },
      { notification_id: 3, event_type: 'NEW_MESSAGE', payload: {}, is_read: false, created_at: '2026-01-01T00:00:00Z' },
    ]);

    render(<NotificationBell />);

    expect(await screen.findByText('2')).toBeInTheDocument();
  });

  it('shows no badge when there are no unread notifications', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([]);

    render(<NotificationBell />);

    await waitFor(() => expect(notificationsApi.listNotifications).toHaveBeenCalled());
    expect(screen.queryByText(/^\d/)).not.toBeInTheDocument();
  });

  it('increments the badge on a live push, and clears it when opened', async () => {
    vi.mocked(notificationsApi.listNotifications).mockResolvedValueOnce([]);
    let pushHandler: ((n: NewNotificationData) => void) | undefined;
    vi.mocked(socketClient.onNewNotification).mockImplementation((handler) => {
      pushHandler = handler;
      return vi.fn();
    });

    render(<NotificationBell />);
    await waitFor(() => expect(notificationsApi.listNotifications).toHaveBeenCalled());

    pushHandler?.({ notification_id: 9, event_type: 'NEW_MESSAGE', payload: {}, is_read: false, created_at: '2026-01-01T00:00:00Z' });

    expect(await screen.findByText('1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(screen.getByText('Notifications', { selector: 'h2' })).toBeInTheDocument();
  });
});
