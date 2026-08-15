import React from 'react';
import { ScheduledMessage } from '../api';

interface ScheduledMessagesListProps {
  scheduledMessages: ScheduledMessage[];
  onCancelScheduledMessage: (id: number) => void;
}

export const ScheduledMessagesList: React.FC<ScheduledMessagesListProps> = ({
  scheduledMessages,
  onCancelScheduledMessage,
}) => {
  if (scheduledMessages.length === 0) {
    return (
      <div className="p-3 text-xs text-center border rounded-md text-[var(--ws-text-secondary)] border-[var(--ws-border)] bg-[var(--ws-bg-hover)]">
        No pending scheduled messages.
      </div>
    );
  }

  const formatScheduledDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2 border rounded-md border-[var(--ws-border)] bg-[var(--ws-bg)]">
      <h4 className="text-xs font-semibold mb-1 text-[var(--ws-text)]">
        Pending Scheduled Messages ({scheduledMessages.length})
      </h4>
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {scheduledMessages.map((msg) => (
          <div
            key={msg.scheduled_id}
            className="flex items-center justify-between p-2 rounded border text-xs bg-[var(--ws-bg-hover)] border-[var(--ws-border)]"
            data-testid="scheduled-message-item"
          >
            <div className="flex flex-col gap-0.5 truncate max-w-[80%]">
              <span className="font-medium truncate text-[var(--ws-text)]">{msg.content}</span>
              <span className="text-[10px] text-[var(--ws-text-secondary)]">
                Will send at: {formatScheduledDate(msg.scheduled_time)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onCancelScheduledMessage(msg.scheduled_id)}
              className="px-2 py-1 text-xs rounded border font-medium text-[var(--ws-danger)] border-[var(--ws-danger)] hover:bg-[var(--ws-bg-hover)]"
              aria-label="Cancel Scheduled Message"
            >
              Cancel
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};