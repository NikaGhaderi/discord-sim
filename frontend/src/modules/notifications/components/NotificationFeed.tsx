import React, { useEffect, useState } from 'react';
import { notificationsApi, socketClient } from '../index';
import { Notification } from '../types';
import { profileApi } from '../../profile';
import { workspacesApi } from '../../workspaces';
import { privateSpacesApi } from '../../private_spaces';

const EVENT_LABELS: Record<string, string> = {
  NEW_MESSAGE: 'New message',
  MESSAGE_DELETED: 'Message deleted',
  INVITATION_ACCEPTED: 'Invitation accepted',
  MEMBER_LEFT: 'Member left',
};

function formatEventType(eventType: string): string {
  if (EVENT_LABELS[eventType]) return EVENT_LABELS[eventType];
  return eventType
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface TopicContext {
  channelName: string;
  topicName: string;
}

/** The user id "responsible" for this notification, whichever field it
 * showed up under -- NEW_MESSAGE uses sender_id, INVITATION_ACCEPTED uses
 * invitee_id, MEMBER_LEFT uses user_id. */
function actorId(payload: Record<string, unknown>): number | undefined {
  return (payload.sender_id ?? payload.invitee_id ?? payload.user_id) as number | undefined;
}

export const NotificationFeed: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [senderNames, setSenderNames] = useState<Record<number, string>>({});
  const [groupNames, setGroupNames] = useState<Record<number, string>>({});
  const [topicContext, setTopicContext] = useState<Record<number, TopicContext>>({});

  useEffect(() => {
    let cancelled = false;
    notificationsApi.listNotifications().then((list) => {
      if (!cancelled) {
        // The API returns read notifications too (they're still real
        // records), but this panel unmounts on close and remounts fresh on
        // reopen -- without filtering here, anything marked read last time
        // would come back from the server and reappear.
        setNotifications(list.filter((n) => !n.is_read));
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

  // Resolve human-readable context (sender username, group name, channel/
  // topic name) for whichever notifications need it that we haven't already
  // fetched -- payloads only carry raw ids.
  useEffect(() => {
    const senderIds = new Set<number>();
    const groupIds = new Set<number>();
    let needsTopicMap = false;
    for (const n of notifications) {
      const senderId = actorId(n.payload);
      const groupId = n.payload.group_id as number | undefined;
      const topicId = n.payload.topic_id as number | undefined;
      if (senderId != null && !(senderId in senderNames)) senderIds.add(senderId);
      if (groupId != null && !(groupId in groupNames)) groupIds.add(groupId);
      if (topicId != null && !(topicId in topicContext)) needsTopicMap = true;
    }

    if (senderIds.size > 0) {
      profileApi.listPublicProfilesByIds([...senderIds]).then((profiles) => {
        setSenderNames((prev) => {
          const next = { ...prev };
          for (const p of profiles) next[p.user_id] = p.username;
          return next;
        });
      });
    }

    if (groupIds.size > 0) {
      Promise.all(
        [...groupIds].map((id) =>
          privateSpacesApi.getGroup(id).then(
            (group) => [id, group.name] as const,
            () => [id, null] as const
          )
        )
      ).then((entries) => {
        setGroupNames((prev) => {
          const next = { ...prev };
          for (const [id, name] of entries) if (name) next[id] = name;
          return next;
        });
      });
    }

    if (needsTopicMap) {
      workspacesApi.listChannels().then((channels) => {
        Promise.all(
          channels.map((channel) =>
            workspacesApi
              .listTopics(channel.channel_id)
              .then((topics) => ({ channel, topics }))
              .catch(() => ({ channel, topics: [] }))
          )
        ).then((results) => {
          setTopicContext((prev) => {
            const next = { ...prev };
            for (const { channel, topics } of results) {
              for (const topic of topics) {
                next[topic.topic_id] = { channelName: channel.name, topicName: topic.title };
              }
            }
            return next;
          });
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  const handleMarkAsRead = async (notificationId: number) => {
    // Once read, the notification drops out of the list entirely rather
    // than sticking around dimmed -- the whole point of "read" here is
    // "I've seen it, remove it".
    setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId));
    try {
      await notificationsApi.markNotificationAsRead(notificationId, true);
    } catch {
      // Best-effort: leave it removed locally even if the persist failed,
      // rather than resurrecting a row the user already dismissed.
    }
  };

  const describeContext = (notification: Notification): string | null => {
    const groupId = notification.payload.group_id as number | undefined;
    const topicId = notification.payload.topic_id as number | undefined;
    const directChatId = notification.payload.direct_chat_id as number | undefined;
    const senderId = actorId(notification.payload);
    const actorName = senderId != null ? senderNames[senderId] : undefined;

    if (groupId != null) {
      const name = groupNames[groupId];
      const groupLabel = name ? `in ${name}` : 'in a group';
      return actorName ? `${actorName} ${groupLabel}` : groupLabel;
    }
    if (topicId != null) {
      const ctx = topicContext[topicId];
      return ctx ? `in #${ctx.channelName} / ${ctx.topicName}` : 'in a channel';
    }
    if (directChatId != null || senderId != null) {
      const name = senderId != null ? senderNames[senderId] : undefined;
      return name ? `from ${name}` : 'in a direct message';
    }
    return null;
  };

  if (isLoading) {
    return <p className="list-row-subtitle">Loading notifications...</p>;
  }

  if (notifications.length === 0) {
    return <p className="empty-state">No notifications yet.</p>;
  }

  return (
    <div>
      {notifications.map((notification) => {
        const context = describeContext(notification);
        return (
          <div key={notification.notification_id} className="list-row">
            <div>
              <div className="list-row-title">
                {!notification.is_read && '● '}
                {formatEventType(notification.event_type)}
                {context ? ` ${context}` : ''}
              </div>
              {typeof notification.payload.content === 'string' && (
                <div className="list-row-subtitle">{notification.payload.content}</div>
              )}
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
        );
      })}
    </div>
  );
};
