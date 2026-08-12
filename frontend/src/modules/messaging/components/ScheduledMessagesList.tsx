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
      <div className="p-3 text-xs text-gray-500 text-center border rounded-md bg-gray-50">
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
    <div className="flex flex-col gap-2 p-2 border border-gray-200 rounded-md bg-white">
      <h4 className="text-xs font-semibold text-gray-700 mb-1">
        Pending Scheduled Messages ({scheduledMessages.length})
      </h4>
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {scheduledMessages.map((msg) => (
          <div
            key={msg.scheduled_id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 text-xs"
            data-testid="scheduled-message-item"
          >
            <div className="flex flex-col gap-0.5 truncate max-w-[80%]">
              <span className="font-medium text-gray-800 truncate">{msg.content}</span>
              <span className="text-gray-500 text-[10px]">
                Will send at: {formatScheduledDate(msg.scheduled_time)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onCancelScheduledMessage(msg.scheduled_id)}
              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200 font-medium"
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