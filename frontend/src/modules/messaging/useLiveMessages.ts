import { useEffect } from 'react';
import { socketClient, NewMessageData, MessageDeletedData } from '../notifications';

interface UseLiveMessagesOptions {
  topicId?: number | null;
  groupId?: number | null;
  directChatId?: number | null;
  onNewMessage: (data: NewMessageData) => void;
  onMessageDeleted: (data: MessageDeletedData) => void;
}

function groupNameFor(
  topicId?: number | null,
  groupId?: number | null,
  directChatId?: number | null
): string | null {
  if (topicId != null) return `topic_${topicId}`;
  if (groupId != null) return `group_${groupId}`;
  if (directChatId != null) return `direct_chat_${directChatId}`;
  return null;
}

/**
 * Subscribes a message thread (topic, group, or direct chat -- exactly one)
 * to live NEW_MESSAGE/MESSAGE_DELETED pushes for that room. Intended for use
 * inside MessageThread.tsx.
 *
 * The real backend scopes delivery server-side by WebSocket group -- once
 * subscribed, every event received here already belongs to this room, so
 * there's no client-side topic/group id to filter on (the payload doesn't
 * carry one). Note: the backend has no "unsubscribe" action, only
 * disconnect -- if this hook mounts against a second topic before the
 * socket ever fully disconnects, the first topic's group subscription
 * stays live server-side and its events would still reach any handler
 * mounted at that moment. Not a concern for this app's current one-thread-
 * at-a-time UI, but worth knowing before reusing this hook somewhere that
 * keeps multiple threads mounted at once.
 */
export function useLiveMessages({
  topicId,
  groupId,
  directChatId,
  onNewMessage,
  onMessageDeleted,
}: UseLiveMessagesOptions): void {
  useEffect(() => {
    const groupName = groupNameFor(topicId, groupId, directChatId);
    if (!groupName) return;

    socketClient.subscribe(groupName);
    const unsubscribeNewMessage = socketClient.onNewMessage(onNewMessage);
    const unsubscribeDeleted = socketClient.onMessageDeleted(onMessageDeleted);

    return () => {
      unsubscribeNewMessage();
      unsubscribeDeleted();
    };
  }, [topicId, groupId, directChatId, onNewMessage, onMessageDeleted]);
}
