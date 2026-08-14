import React, { useState, FormEvent } from 'react';
import { Modal } from '@shared/components/Modal';
import { privateSpacesApi } from '../index';
import { Group } from '../types';

interface JoinGroupModalProps {
  onClose: () => void;
  onJoined: (group: Group) => void;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({ onClose, onJoined }) => {
  const [inviteToken, setInviteToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const group = await privateSpacesApi.joinGroupByInviteToken(inviteToken.trim());
      onJoined(group);
      onClose();
    } catch {
      setError('Failed to join group. Check the invite link and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title="Join a Group" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className="error-text">{error}</p>}
        <div className="field">
          <label htmlFor="group-invite-token">Invite Link or Token</label>
          <input
            id="group-invite-token"
            type="text"
            required
            placeholder="e.g. a1b2c3d4"
            value={inviteToken}
            onChange={(e) => setInviteToken(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Joining...' : 'Join'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
