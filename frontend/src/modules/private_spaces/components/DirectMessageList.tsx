import React, { useState } from 'react';
import { DirectMessage } from '../types';

interface DirectMessageListProps {
  initialDms?: DirectMessage[];
  onSelectDm?: (dm: DirectMessage) => void;
}

const defaultDms: DirectMessage[] = [
  { id: 'dm-1', recipient_username: 'parnia_dev', last_message: 'Hey, did you check the workspace ticket?', updated_at: '10:30 AM' },
  { id: 'dm-2', recipient_username: 'nika_lead', last_message: 'PR looks good to merge!', updated_at: 'Yesterday' },
];

export const DirectMessageList: React.FC<DirectMessageListProps> = ({ initialDms = defaultDms, onSelectDm }) => {
  const [dms, setDms] = useState<DirectMessage[]>(initialDms);
  const [newUsername, setNewUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleStartDm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    const newDm: DirectMessage = {
      id: `dm-${Date.now()}`,
      recipient_username: newUsername.trim(),
      last_message: 'Started a new conversation',
      updated_at: 'Just now',
    };

    setDms([newDm, ...dms]);
    setNewUsername('');
    setIsCreating(false);
  };

  return (
    <div className="dm-list-container">
      <h3>Direct Messages</h3>
      {!isCreating ? (
        <button onClick={() => setIsCreating(true)} className="btn-primary">
          Start New DM
        </button>
      ) : (
        <form onSubmit={handleStartDm} className="start-dm-form">
          <input
            type="text"
            placeholder="Enter username..."
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            required
          />
          <button type="submit">Start</button>
          <button type="button" onClick={() => setIsCreating(false)}>Cancel</button>
        </form>
      )}

      <ul className="dm-list">
        {dms.map((dm) => (
          <li key={dm.id} onClick={() => onSelectDm?.(dm)} className="dm-item">
            <strong>@{dm.recipient_username}</strong>
            <p>{dm.last_message}</p>
            <small>{dm.updated_at}</small>
          </li>
        ))}
      </ul>
    </div>
  );
};