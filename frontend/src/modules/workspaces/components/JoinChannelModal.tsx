import React, { useState, FormEvent } from 'react';
import { Modal } from '@shared/components/Modal';
import { workspacesApi } from '../index';
import { ChannelMember } from '../types';

interface JoinChannelModalProps {
  onClose: () => void;
  onJoined: (membership: ChannelMember) => void;
}

export const JoinChannelModal: React.FC<JoinChannelModalProps> = ({ onClose, onJoined }) => {
  const [inviteToken, setInviteToken] = useState('');
  const [nickname, setNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const membership = await workspacesApi.joinChannelByInviteToken(
        inviteToken.trim(),
        nickname.trim() || undefined
      );
      onJoined(membership);
      onClose();
    } catch {
      setError('Failed to join channel. Check the invite link and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title="Join a Channel" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <p className="error-text">{error}</p>}
        <div className="field">
          <label htmlFor="invite-token">Invite Link or Token</label>
          <input
            id="invite-token"
            type="text"
            required
            placeholder="e.g. a1b2c3d4"
            value={inviteToken}
            onChange={(e) => setInviteToken(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="nickname">Nickname (optional)</label>
          <input
            id="nickname"
            type="text"
            maxLength={50}
            placeholder="e.g. Sprint Master"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
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
