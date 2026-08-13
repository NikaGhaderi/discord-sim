import React, { useCallback, useEffect, useState, useRef, useLayoutEffect, UIEvent } from 'react';
import { resolveMediaUrl } from '@infrastructure/apiClient';
import { Message } from '../types';
import { messagingApi, MessageTarget } from '../index';
import { useLiveMessages } from '../useLiveMessages';
import { NewMessageData, MessageDeletedData } from '../../notifications';
import { Composer } from './Composer';
import { MessageActions } from './MessageActions';
import { MediaUploadButton, SelectedFile } from './MediaUploadButton';

const PAGE_SIZE = 20;

interface MessageThreadProps {
  /** Exactly one of topicId/groupId/directChatId should be set -- whichever
   * kind of room this thread is showing. When none are set, this thread
   * receives no live updates and can't send/schedule messages (same
   * read-only behavior as before SCRUM-55/the messaging UI integration). */
  topicId?: number;
  groupId?: number;
  directChatId?: number;
  currentUserId?: number;
  /** True if the current user holds DELETE_MESSAGES in this channel --
   * lets them delete others' messages, mirroring the backend's
   * sender-OR-permission rule. Editing is always sender-only regardless.
   * Not applicable to groups/DMs, which have no such permission concept. */
  hasDeletePermission?: boolean;
  /** sender_id -> display name overrides (e.g. a channel nickname). The
   * backend never sends a real username on a message, only sender_id --
   * msg.sender_username is a client-side "User #<id>" placeholder computed
   * in api.ts, and this is the mechanism for replacing it with something
   * more meaningful when the caller has that information available. */
  senderNameOverrides?: Record<number, string>;
}

function addMessageIfNew(messages: Message[], incoming: Message): Message[] {
  if (messages.some((m) => m.base_message_id === incoming.base_message_id)) {
    return messages;
  }
  return [...messages, incoming];
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  topicId,
  groupId,
  directChatId,
  currentUserId,
  hasDeletePermission = false,
  senderNameOverrides,
}) => {
  const target: MessageTarget = {
    topic_id: topicId,
    group_id: groupId,
    direct_chat_id: directChatId,
  };
  const hasTarget = topicId !== undefined || groupId !== undefined || directChatId !== undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [offset, setOffset] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);

  // The backend orders messages oldest-first and paginates from the start,
  // so "give me the latest page" means first learning the total count, then
  // fetching the last PAGE_SIZE of it -- there's no "give me the tail"
  // shortcut on this endpoint.
  useEffect(() => {
    if (!hasTarget) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    messagingApi
      .listMessages(target, PAGE_SIZE, 0)
      .then(async (firstPage) => {
        if (cancelled) return;
        if (firstPage.count <= PAGE_SIZE) {
          setMessages(firstPage.results);
          setOffset(0);
          setHasMore(false);
          return;
        }
        const latestOffset = firstPage.count - PAGE_SIZE;
        const latestPage = await messagingApi.listMessages(target, PAGE_SIZE, latestOffset);
        if (cancelled) return;
        setMessages(latestPage.results);
        setOffset(latestOffset);
        setHasMore(latestOffset > 0);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load messages.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, groupId, directChatId]);

  const handleNewMessage = useCallback((data: NewMessageData) => {
    setMessages((prev) =>
      addMessageIfNew(prev, {
        base_message_id: data.base_message_id,
        sender_id: data.sender_id,
        sender_username: `User #${data.sender_id}`,
        content: data.content,
        sent_at: data.sent_at,
        is_edited: data.is_edited,
        media: data.media,
      })
    );
  }, []);

  const handleMessageDeleted = useCallback((data: MessageDeletedData) => {
    setMessages((prev) => prev.filter((m) => m.base_message_id !== data.base_message_id));
  }, []);

  useLiveMessages({
    topicId,
    groupId,
    directChatId,
    onNewMessage: handleNewMessage,
    onMessageDeleted: handleMessageDeleted,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollHeightBeforeLoad = useRef<number>(0);

  // حفظ موقعیت اسکرول پس از بارگذاری پیام‌های قدیمی‌تر در بالای لیست
  useLayoutEffect(() => {
    if (containerRef.current && scrollHeightBeforeLoad.current > 0) {
      const currentScrollHeight = containerRef.current.scrollHeight;
      const heightDifference = currentScrollHeight - scrollHeightBeforeLoad.current;
      containerRef.current.scrollTop = heightDifference;
      scrollHeightBeforeLoad.current = 0;
    }
  }, [messages]);

  const loadMoreMessages = () => {
    if (loading || !hasMore || !hasTarget) return;

    setLoading(true);
    if (containerRef.current) {
      scrollHeightBeforeLoad.current = containerRef.current.scrollHeight;
    }

    const previousOffset = Math.max(0, offset - PAGE_SIZE);
    messagingApi
      .listMessages(target, PAGE_SIZE, previousOffset)
      .then((page) => {
        setMessages((prev) => [...page.results, ...prev]);
        setOffset(previousOffset);
        setHasMore(previousOffset > 0);
      })
      .catch(() => setError('Failed to load older messages.'))
      .finally(() => setLoading(false));
  };

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMore && !loading) {
      loadMoreMessages();
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!hasTarget) return;
    setError(null);
    try {
      const sent = await messagingApi.sendMessage({ ...target, content });
      setMessages((prev) => addMessageIfNew(prev, sent));
      if (selectedFile) {
        const file = selectedFile;
        setSelectedFile(null);
        const attachment = await messagingApi.attachMedia(sent.base_message_id, file.file);
        setMessages((prev) =>
          prev.map((m) =>
            m.base_message_id === sent.base_message_id
              ? {
                  ...m,
                  media: [
                    ...(m.media ?? []),
                    { file_url: attachment.file_url, file_type: attachment.file_type },
                  ],
                }
              : m
          )
        );
      }
    } catch {
      setError('Failed to send message.');
    }
  };

  const handleScheduleMessage = async (content: string, scheduledAt: string) => {
    if (!hasTarget) return;
    setError(null);
    try {
      await messagingApi.createScheduledMessage({
        ...target,
        content,
        scheduled_time: new Date(scheduledAt).toISOString(),
      });
    } catch {
      setError('Failed to schedule message.');
    }
  };

  const handleEditMessage = async (messageId: number, newContent: string) => {
    setError(null);
    try {
      const updated = await messagingApi.editMessage(messageId, newContent);
      setMessages((prev) =>
        prev.map((m) => (m.base_message_id === messageId ? { ...m, ...updated } : m))
      );
    } catch {
      setError('Failed to edit message.');
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    setError(null);
    try {
      await messagingApi.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.base_message_id !== messageId));
    } catch {
      setError('Failed to delete message.');
    }
  };

  return (
    <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
      {error && (
        <div className="text-center py-1 text-xs text-red-400" role="alert">
          {error}
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        data-testid="message-thread-scroll"
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ minHeight: 0 }}
      >
        {loading && (
          <div className="text-center py-2 text-sm text-gray-400">
            Loading messages...
          </div>
        )}

        {!loading && !hasMore && messages.length > 0 && (
          <div className="text-center py-2 text-xs text-gray-500">
            Beginning of message history
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.base_message_id} className="flex flex-col bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white">
                {senderNameOverrides?.[msg.sender_id] ?? msg.sender_username}
              </span>
              <span className="text-xs text-gray-400">{msg.sent_at}</span>
              {msg.is_edited && (
                <span className="text-xs text-gray-500 italic">(edited)</span>
              )}
            </div>
            <p className="text-gray-200 mt-1">{msg.content}</p>
            {msg.media && msg.media.length > 0 && (
              <ul className="mt-1 space-y-1">
                {msg.media.map((item, index) => {
                  const resolvedUrl = resolveMediaUrl(item.file_url);
                  const isImage = item.file_type.startsWith('image/');
                  return (
                    <li key={index}>
                      {isImage ? (
                        <a href={resolvedUrl} target="_blank" rel="noreferrer">
                          <img
                            src={resolvedUrl}
                            alt={item.file_url.split('/').pop()}
                            className="mt-1 max-w-xs max-h-64 rounded"
                          />
                        </a>
                      ) : (
                        <a
                          href={resolvedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-400 hover:underline"
                        >
                          {item.file_url.split('/').pop()}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {currentUserId !== undefined && (
              <div className="mt-1">
                <MessageActions
                  message={msg}
                  currentUserId={currentUserId}
                  hasDeletePermission={hasDeletePermission}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {hasTarget && currentUserId !== undefined && (
        <div className="flex items-end gap-2 border-t border-gray-200 p-2">
          <MediaUploadButton selectedFile={selectedFile} onFileSelect={setSelectedFile} />
          <div className="flex-1">
            <Composer
              onSendMessage={handleSendMessage}
              onScheduleMessage={handleScheduleMessage}
              hasAttachment={selectedFile !== null}
            />
          </div>
        </div>
      )}
    </div>
  );
};
