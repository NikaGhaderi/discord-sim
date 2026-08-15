import React, { useEffect, useState } from 'react';
import { workspacesApi } from '../index';
import { Topic } from '../types';

interface TopicTabsProps {
  channelId: number;
  selectedTopicId: number | undefined;
  onSelectTopic: (topicId: number) => void;
  /** Bumped by the parent whenever a topic might have been created/deleted
   * elsewhere (e.g. the Manage Topics modal closing), to trigger a refetch. */
  refreshKey?: number;
}

export const TopicTabs: React.FC<TopicTabsProps> = ({
  channelId,
  selectedTopicId,
  onSelectTopic,
  refreshKey,
}) => {
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    let cancelled = false;
    workspacesApi.listTopics(channelId).then((list) => {
      if (!cancelled) setTopics(list);
    });
    return () => {
      cancelled = true;
    };
  }, [channelId, refreshKey]);

  if (topics.length <= 1) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: '8px 20px 0',
        borderBottom: '1px solid var(--ws-border)',
      }}
    >
      {topics.map((topic) => (
        <button
          key={topic.topic_id}
          type="button"
          onClick={() => onSelectTopic(topic.topic_id)}
          style={{
            padding: '6px 12px',
            border: 'none',
            borderBottom:
              topic.topic_id === selectedTopicId
                ? '2px solid var(--ws-primary)'
                : '2px solid transparent',
            background: 'none',
            cursor: 'pointer',
            fontWeight: topic.topic_id === selectedTopicId ? 700 : 400,
            color: topic.topic_id === selectedTopicId ? 'var(--ws-text)' : 'var(--ws-text-secondary)',
          }}
        >
          # {topic.title}
        </button>
      ))}
    </div>
  );
};
