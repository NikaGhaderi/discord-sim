import React, { useState, FormEvent } from 'react';
import { Modal } from '@shared/components/Modal';
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
      <form onSubmit={handleSubmit}>
        {error && <p className="error-text">{error}</p>}
        <div className="field">
          <label htmlFor="channel-name">Channel Name</label>
          <input
            id="channel-name"
            type="text"
            required
            minLength={2}
            maxLength={100}
            placeholder="e.g. study-group"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {/* Privacy is shown per the wireframe but not part of the confirmed API contract yet. */}
        <div className="field">
          <label htmlFor="channel-privacy">Privacy</label>
          <select id="channel-privacy" defaultValue="public" disabled>
            <option value="public">Public</option>
          </select>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
