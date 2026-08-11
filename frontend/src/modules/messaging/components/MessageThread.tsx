import React, { useState, useRef, useLayoutEffect, UIEvent } from 'react';
import { Message } from '../types';

const MOCK_ALL_MESSAGES: Message[] = Array.from({ length: 60 }, (_, index) => {
  const msgNum = 60 - index;
  return {
    base_message_id: msgNum,
    sender_id: msgNum % 2 === 0 ? 1 : 2,
    sender_username: msgNum % 2 === 0 ? 'nika_lead' : 'ftm_roosta',
    content: `Message content #${msgNum}`,
    sent_at: '12:34 PM',
    is_edited: msgNum % 3 === 0,
  };
});

const PAGE_SIZE = 20;

export const MessageThread: React.FC = () => {
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // نمایش پیام‌ها به ترتیب زمانی (قدیمی‌ترین بالا، جدیدترین پایین)
  const [messages, setMessages] = useState<Message[]>(() =>
    MOCK_ALL_MESSAGES.slice(-PAGE_SIZE)
  );

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
    if (loading || !hasMore) return;

    setLoading(true);
    if (containerRef.current) {
      scrollHeightBeforeLoad.current = containerRef.current.scrollHeight;
    }

    // شبیه‌سازی API call
    setTimeout(() => {
      const nextPage = page + 1;
      const startIndex = Math.max(0, MOCK_ALL_MESSAGES.length - nextPage * PAGE_SIZE);
      const endIndex = MOCK_ALL_MESSAGES.length - page * PAGE_SIZE;

      const olderMessages = MOCK_ALL_MESSAGES.slice(startIndex, endIndex);

      if (olderMessages.length > 0) {
        setMessages((prev) => [...olderMessages, ...prev]);
        setPage(nextPage);
      }

      if (startIndex === 0) {
        setHasMore(false);
      }

      setLoading(false);
    }, 500);
  };

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMore && !loading) {
      loadMoreMessages();
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      data-testid="message-thread-scroll"
      className="flex-1 overflow-y-auto p-4 space-y-4"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
    >
      {loading && (
        <div className="text-center py-2 text-sm text-gray-400">
          Loading older messages...
        </div>
      )}

      {!hasMore && (
        <div className="text-center py-2 text-xs text-gray-500">
          Beginning of message history
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.base_message_id} className="flex flex-col bg-gray-800 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-white">{msg.sender_username}</span>
            <span className="text-xs text-gray-400">{msg.sent_at}</span>
            {msg.is_edited && (
              <span className="text-xs text-gray-500 italic">(edited)</span>
            )}
          </div>
          <p className="text-gray-200 mt-1">{msg.content}</p>
        </div>
      ))}
    </div>
  );
};