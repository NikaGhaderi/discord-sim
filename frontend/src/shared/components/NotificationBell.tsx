import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { NotificationFeed } from '../../modules/notifications/components/NotificationFeed';
import { notificationsApi, socketClient } from '../../modules/notifications';

/**
 * Global notifications bell -- lives in the persistent AppNav so it's
 * reachable from every page. Previously this was a plain "Notifications"
 * entry buried inside ChannelSidebar, which meant it was only visible
 * while on /workspaces; a group-message notification (or any DM/group
 * event) was effectively invisible from /private-spaces, since nothing
 * there rendered NotificationFeed at all. The underlying data was already
 * target-agnostic (NEW_MESSAGE is recorded for topic/group/direct_chat
 * alike) -- the gap was purely in where the UI to see it lived.
 */
export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    notificationsApi.listNotifications().then((list) => {
      if (!cancelled) setUnreadCount(list.filter((n) => !n.is_read).length);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return socketClient.onNewNotification(() => {
      setUnreadCount((count) => count + 1);
    });
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    // Opening the panel counts as "seen" for the badge -- individual items
    // still track their own is_read state via NotificationFeed's own
    // "Mark as read" controls.
    setUnreadCount(0);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className="btn"
        style={{ position: 'relative' }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: 'var(--ws-danger)',
              color: '#fff',
              borderRadius: '50%',
              fontSize: 10,
              fontWeight: 700,
              minWidth: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <Modal title="Notifications" onClose={() => setIsOpen(false)}>
          <NotificationFeed />
        </Modal>
      )}
    </>
  );
};
