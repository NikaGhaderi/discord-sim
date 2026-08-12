import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@infrastructure/apiClient';
import * as realApi from '../api';
import * as mockApi from '../mockApi';

vi.mock('@infrastructure/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Notifications API (SCRUM-51/54)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Real API', () => {
    it('listNotifications requests GET /api/notifications/', async () => {
      const notifications = [
        {
          notification_id: 1,
          event_type: 'NEW_MESSAGE',
          payload: { base_message_id: 5 },
          is_read: false,
          created_at: '2026-01-01T00:00:00Z',
        },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: notifications });

      const result = await realApi.listNotifications();

      expect(apiClient.get).toHaveBeenCalledWith('/api/notifications/');
      expect(result).toEqual(notifications);
    });

    it('markNotificationAsRead requests PATCH /api/notifications/:id/ with is_read defaulting to true', async () => {
      const updated = {
        notification_id: 1,
        event_type: 'NEW_MESSAGE',
        payload: {},
        is_read: true,
        created_at: '2026-01-01T00:00:00Z',
      };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: updated });

      const result = await realApi.markNotificationAsRead(1);

      expect(apiClient.patch).toHaveBeenCalledWith('/api/notifications/1/', { is_read: true });
      expect(result).toEqual(updated);
    });

    it('markNotificationAsRead can explicitly mark unread', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: { notification_id: 1, event_type: 'NEW_MESSAGE', payload: {}, is_read: false, created_at: 'x' },
      });

      await realApi.markNotificationAsRead(1, false);

      expect(apiClient.patch).toHaveBeenCalledWith('/api/notifications/1/', { is_read: false });
    });
  });

  describe('Mock API', () => {
    it('listNotifications returns the seeded mock data', async () => {
      const result = await mockApi.listNotifications();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('notification_id');
      expect(result[0]).toHaveProperty('event_type');
      expect(result[0]).toHaveProperty('payload');
    });

    it('markNotificationAsRead updates the matching mock notification', async () => {
      const [first] = await mockApi.listNotifications();
      const updated = await mockApi.markNotificationAsRead(first.notification_id, true);
      expect(updated.is_read).toBe(true);
    });

    it('markNotificationAsRead rejects for an unknown id', async () => {
      await expect(mockApi.markNotificationAsRead(999999, true)).rejects.toThrow();
    });
  });
});
