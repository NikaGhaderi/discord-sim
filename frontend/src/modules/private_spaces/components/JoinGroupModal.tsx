import React, { useState, FormEvent } from 'react';
import { Modal } from '@shared/components/Modal';
import { Input } from '@shared/components/ui/Input';
import { Button } from '@shared/components/ui/Button';
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Invite Link or Token"
          required
          placeholder="e.g. a1b2c3d4"
          value={inviteToken}
          onChange={(e) => setInviteToken(e.target.value)}
          error={error ?? undefined}
          name="inviteToken"
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
