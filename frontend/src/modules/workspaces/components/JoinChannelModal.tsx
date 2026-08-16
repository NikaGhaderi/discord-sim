import React, { useState, FormEvent } from 'react';
import { Modal } from '@shared/components/Modal';
import { Input } from '@shared/components/ui/Input';
import { Button } from '@shared/components/ui/Button';
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Invite Link or Token"
          name="inviteToken"
          required
          placeholder="e.g. a1b2c3d4"
          value={inviteToken}
          onChange={(e) => setInviteToken(e.target.value)}
          error={error ?? undefined}
        />
        <Input
          label="Nickname (optional)"
          maxLength={50}
          placeholder="e.g. Sprint Master"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Joining...' : 'Join'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
