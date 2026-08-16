import React, { useState, FormEvent } from 'react';
import { Modal } from '@shared/components/Modal';
import { Input } from '@shared/components/ui/Input';
import { Button } from '@shared/components/ui/Button';
import { workspacesApi } from '../index';
import { Channel } from '../types';

interface CreateChannelModalProps {
  onClose: () => void;
  onCreated: (channel: Channel) => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const channel = await workspacesApi.createChannel(name.trim());
      onCreated(channel);
      onClose();
    } catch {
      setError('Failed to create channel. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title="Create Channel" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Channel Name"
          name="name"
          required
          minLength={2}
          maxLength={100}
          placeholder="e.g. study-group"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error ?? undefined}
        />
        {/* Privacy is shown per the wireframe but not part of the confirmed API contract yet. */}
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Privacy
          <select
            defaultValue="public"
            disabled
            className="min-h-11 rounded-xl border border-border bg-background px-3.5 text-foreground"
          >
            <option value="public">Public</option>
          </select>
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
