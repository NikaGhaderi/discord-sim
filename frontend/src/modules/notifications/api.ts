import { apiClient } from '@infrastructure/apiClient';
import { Notification } from './types';

/** Shared contract for both implementations (real and mock). */
export interface NotificationsApi {
  listNotifications(): Promise<Notification[]>;
  markNotificationAsRead(notificationId: number, isRead?: boolean): Promise<Notification>;
}

const ENDPOINTS = {
  notifications: '/api/notifications/',
  notification: (notificationId: number) => `/api/notifications/${notificationId}/`,
} as const;

export const listNotifications = async (): Promise<Notification[]> => {
  const response = await apiClient.get<Notification[]>(ENDPOINTS.notifications);
  return response.data;
};

export const markNotificationAsRead = async (
  notificationId: number,
  isRead: boolean = true
): Promise<Notification> => {
  const response = await apiClient.patch<Notification>(ENDPOINTS.notification(notificationId), {
    is_read: isRead,
  });
  return response.data;
};
