import React, { useState } from 'react';
import { Message } from '../types';
import { MessageComposer } from './MessageComposer';
import { MessageSearch } from './MessageSearch';

interface ThreadViewProps {
  initialMessages?: Message[];
}

const defaultMessages: Message[] = [
  {
    id: 'msg-1',
    sender_id: 'usr-1',
    sender_username: 'nika_lead',
    content: 'Welcome to the channel! Feel free to ask questions here.',
    created_at: '10:00 AM',
  },
  {
    id: 'msg-2',
    sender_id: 'usr-2',
    sender_username: 'parnia_dev',
    content: 'Workspaces UI structure is updated.',
    created_at: '10:15 AM',
  },
];

export const ThreadView: React.FC<ThreadViewProps> = ({ initialMessages = defaultMessages }) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSendMessage = (content: string, file?: File | null) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sender_id: 'usr-me',
      sender_username: 'ftm_roosta',
      content,
      media_url: file ? URL.createObjectURL(file) : null,
      created_at: 'Just now',
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const filteredMessages = messages.filter((msg) =>
    msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.sender_username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="thread-view-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '15px' }}>
      <header style={{ marginBottom: '15px' }}>
        <MessageSearch onSearch={(q) => setSearchQuery(q)} />
      </header>

      <div className="messages-list" style={{ flex: 1, overflowY: 'auto', marginBottom: '15px' }}>
        {filteredMessages.length === 0 ? (
          <p>No messages found.</p>
        ) : (
          filteredMessages.map((msg) => (
            <div key={msg.id} className="message-item" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong>@{msg.sender_username}</strong>
                <small style={{ color: '#888' }}>{msg.created_at}</small>
              </div>
              <p style={{ margin: '4px 0' }}>{msg.content}</p>
              {msg.media_url && (
                <div className="media-attachment">
                  <small>📎 Attached Media</small>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <footer>
        <MessageComposer onSendMessage={handleSendMessage} />
      </footer>
    </div>
  );
};