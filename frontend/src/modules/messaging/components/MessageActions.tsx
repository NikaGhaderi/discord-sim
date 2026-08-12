import React, { useState } from 'react';
import { Message } from '../types';

interface MessageActionsProps {
  message: Message;
  currentUserId: number;
  hasDeletePermission?: boolean;
  onEditMessage: (messageId: number, newContent: string) => void;
  onDeleteMessage: (messageId: number) => void;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  currentUserId,
  hasDeletePermission = false,
  onEditMessage,
  onDeleteMessage,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isSender = currentUserId === message.sender_id;
  const canEdit = isSender; // Strict rule: editing is non-delegable
  const canDelete = isSender || hasDeletePermission;

  const handleSaveEdit = () => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    onEditMessage(message.base_message_id, trimmed);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-2">
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
          />
          <button
            onClick={handleSaveEdit}
            className="text-xs text-green-600 hover:underline"
          >
            Save
          </button>
          <button
            onClick={handleCancelEdit}
            className="text-xs text-gray-500 hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="hover:text-indigo-600"
              aria-label="Edit Message"
            >
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDeleteMessage(message.base_message_id)}
              className="hover:text-red-600"
              aria-label="Delete Message"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};