import React, { useEffect, useState } from 'react';
import { messagingApi, MessageTarget, ScheduledMessage } from '../index';
import { ScheduledMessagesList } from './ScheduledMessagesList';

interface ScheduledMessagesPanelProps {
  target: MessageTarget;
}

export const ScheduledMessagesPanel: React.FC<ScheduledMessagesPanelProps> = ({ target }) => {
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    messagingApi.listScheduledMessages(target).then((list) => {
      if (!cancelled) {
        setScheduledMessages(list);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.topic_id, target.group_id, target.direct_chat_id]);

  const handleCancel = async (scheduledId: number) => {
    await messagingApi.cancelScheduledMessage(scheduledId);
    setScheduledMessages((prev) => prev.filter((s) => s.scheduled_id !== scheduledId));
  };

  if (loading) {
    return <div className="p-3 text-xs text-[var(--ws-text-secondary)]">Loading scheduled messages...</div>;
  }

  return (
    <ScheduledMessagesList
      scheduledMessages={scheduledMessages}
      onCancelScheduledMessage={handleCancel}
    />
  );
};
