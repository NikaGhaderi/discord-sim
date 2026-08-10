import React, { useState } from 'react';

interface MessageComposerProps {
  onSendMessage: (content: string, file?: File | null) => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({ onSendMessage }) => {
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !selectedFile) return;

    onSendMessage(content.trim(), selectedFile);
    setContent('');
    setSelectedFile(null);
  };

  return (
    <form onSubmit={handleSubmit} className="message-composer">
      <div className="composer-input-group">
        <input
          type="text"
          placeholder="Write a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required={!selectedFile}
        />
        <input
          type="file"
          id="media-upload"
          style={{ display: 'none' }}
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        />
        <label htmlFor="media-upload" className="btn-attachment" style={{ cursor: 'pointer' }}>
          📎 {selectedFile ? selectedFile.name : 'Attach Media'}
        </label>
        <button type="submit" className="btn-send">Send</button>
      </div>
    </form>
  );
};