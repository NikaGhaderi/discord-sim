import React, { useEffect, useState, FormEvent } from 'react';
import { Modal } from '@shared/components/Modal';
import { Input } from '@shared/components/ui/Input';
import { Button } from '@shared/components/ui/Button';
import { workspacesApi } from '../index';
import { Topic } from '../types';

interface TopicManagerModalProps {
  channelId: number;
  onClose: () => void;
}

export const TopicManagerModal: React.FC<TopicManagerModalProps> = ({ channelId, onClose }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    workspacesApi.listTopics(channelId).then((list) => {
      if (!cancelled) {
        setTopics(list);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const topic = await workspacesApi.createTopic(channelId, title.trim());
      setTopics((prev) => [...prev, topic]);
      setTitle('');
    } catch {
      setError('Failed to create topic. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (topic: Topic) => {
    if (topics.length <= 1) {
      setError('A channel must keep at least one topic.');
      return;
    }
    if (!window.confirm(`Delete topic "${topic.title}"?`)) return;
    setError(null);
    try {
      await workspacesApi.deleteTopic(channelId, topic.topic_id);
      setTopics((prev) => prev.filter((t) => t.topic_id !== topic.topic_id));
    } catch {
      setError(`Failed to delete topic "${topic.title}".`);
    }
  };

  return (
    <Modal title="Manage Topics" onClose={onClose}>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      {isLoading && <p className="text-sm text-muted">Loading topics...</p>}

      {!isLoading &&
        topics.map((topic) => (
          <div key={topic.topic_id} className="list-row flex items-center justify-between py-2">
            <div className="list-row-title"># {topic.title}</div>
            <Button variant="danger" size="sm" onClick={() => handleDelete(topic)}>
              Delete
            </Button>
          </div>
        ))}

      <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3">
        <Input
          label="New Topic Title"
          required
          minLength={2}
          maxLength={100}
          placeholder="e.g. announcements"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Topic'}
        </Button>
      </form>
    </Modal>
  );
};
