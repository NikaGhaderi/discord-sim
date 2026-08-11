import React, { useEffect, useState, FormEvent } from 'react';
import { Modal } from '@shared/components/Modal';
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
      {error && <p className="error-text">{error}</p>}
      {isLoading && <p className="list-row-subtitle">Loading topics...</p>}

      {!isLoading &&
        topics.map((topic) => (
          <div key={topic.topic_id} className="list-row">
            <div className="list-row-title"># {topic.title}</div>
            <button type="button" className="btn btn-danger" onClick={() => handleDelete(topic)}>
              Delete
            </button>
          </div>
        ))}

      <form onSubmit={handleCreate} style={{ marginTop: 16 }}>
        <div className="field">
          <label htmlFor="topic-title">New Topic Title</label>
          <input
            id="topic-title"
            type="text"
            required
            minLength={2}
            maxLength={100}
            placeholder="e.g. announcements"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Topic'}
        </button>
      </form>
    </Modal>
  );
};
