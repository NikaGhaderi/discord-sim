import React, { useEffect, useState } from 'react';
import { notificationsApi, socketClient } from '../index';
import { Notification } from '../types';

export const NotificationFeed: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    notificationsApi.listNotifications().then((list) => {
      if (!cancelled) {
        setNotifications(list);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return socketClient.onNewNotification((notification) => {
      setNotifications((prev) => [notification as Notification, ...prev]);
    });
  }, []);

  const handleMarkAsRead = async (notificationId: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === notificationId ? { ...n, is_read: true } : n))
    );
    try {
      await notificationsApi.markNotificationAsRead(notificationId, true);
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === notificationId ? { ...n, is_read: false } : n))
      );
    }
  };

  if (isLoading) {
    return <p className="list-row-subtitle">Loading notifications...</p>;
  }

  if (notifications.length === 0) {
    return <p className="empty-state">No notifications yet.</p>;
  }

  return (
    <div>
      {notifications.map((notification) => (
        <div key={notification.notification_id} className="list-row">
          <div>
            <div className="list-row-title">
              {!notification.is_read && '● '}
              {notification.event_type}
            </div>
            <div className="list-row-subtitle">
              {typeof notification.payload.content === 'string'
                ? notification.payload.content
                : JSON.stringify(notification.payload)}
            </div>
          </div>
          {!notification.is_read && (
            <button
              type="button"
              className="btn"
              onClick={() => handleMarkAsRead(notification.notification_id)}
            >
              Mark as read
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
