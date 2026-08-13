import React, { useState, KeyboardEvent } from 'react';

interface ComposerProps {
  onSendMessage: (content: string) => void;
  onScheduleMessage?: (content: string, scheduledAt: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** True when a file is staged in the sibling MediaUploadButton -- lets a
   * send go through with no text at all (media-only), since the backend
   * allows a blank message body. Doesn't apply to scheduling: there's no
   * way to attach media to a message that doesn't exist yet. */
  hasAttachment?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({
  onSendMessage,
  onScheduleMessage,
  placeholder = 'Type a message...',
  disabled = false,
  hasAttachment = false,
}) => {
  const [content, setContent] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  // ISO string formatted for datetime-local min attribute (YYYY-MM-DDTHH:mm)
  const nowMin = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const handleSend = () => {
    const trimmed = content.trim();

    if (isScheduling && scheduledAt) {
      if (!trimmed) return;
      onScheduleMessage?.(trimmed, scheduledAt);
      setScheduledAt('');
      setIsScheduling(false);
    } else {
      if (!trimmed && !hasAttachment) return;
      onSendMessage(trimmed);
    }
    setContent('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* No border/padding of its own -- the composer row in MessageThread
          already provides that around both Composer and MediaUploadButton
          together, so this stays flush with the Attach button next to it. */}
      {isScheduling && (
        <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded-md border border-indigo-200 text-xs">
          <span className="font-medium text-indigo-800">Schedule for:</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            min={nowMin}
            onChange={(e) => setScheduledAt(e.target.value)}
            disabled={disabled}
            className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            data-testid="schedule-datetime-input"
          />
          <button
            type="button"
            onClick={() => setIsScheduling(false)}
            className="text-gray-500 hover:text-red-500 font-bold ml-auto"
            aria-label="Cancel Schedule Mode"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <button
          type="button"
          onClick={() => setIsScheduling(!isScheduling)}
          disabled={disabled}
          className={`p-2 rounded-md text-sm font-medium border ${
            isScheduling
              ? 'bg-indigo-100 border-indigo-400 text-indigo-700'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
          aria-label="Toggle Schedule"
          title="Schedule message"
        >
          🕒
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={
            disabled ||
            (isScheduling ? !content.trim() || !scheduledAt : !content.trim() && !hasAttachment)
          }
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScheduling ? 'Schedule' : 'Send'}
        </button>
      </div>
    </div>
  );
};