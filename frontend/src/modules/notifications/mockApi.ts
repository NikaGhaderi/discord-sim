import { Notification } from './types';

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    notification_id: 88,
    event_type: 'NEW_MESSAGE',
    payload: { base_message_id: 1025, content: "Samyar: don't forget the CTF meeting" },
    is_read: false,
    created_at: '2026-06-19T18:00:00Z',
  },
];

export const listNotifications = async (): Promise<Notification[]> => {
  return Promise.resolve([...MOCK_NOTIFICATIONS]);
};

export const markNotificationAsRead = async (
  notificationId: number,
  isRead: boolean = true
): Promise<Notification> => {
  const target = MOCK_NOTIFICATIONS.find((n) => n.notification_id === notificationId);
  if (!target) {
    return Promise.reject(new Error('Notification not found.'));
  }
  target.is_read = isRead;
  return Promise.resolve({ ...target });
};
