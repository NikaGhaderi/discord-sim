import React, { useEffect, useState } from 'react';
import { workspacesApi } from '../index';
import { Topic } from '../types';
import { cn } from '@shared/lib/cn';

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
    <div className="flex gap-1 border-b border-border px-5 pt-2">
      {topics.map((topic) => (
        <button
          key={topic.topic_id}
          type="button"
          onClick={() => onSelectTopic(topic.topic_id)}
          className={cn(
            'border-b-2 border-transparent px-3 py-1.5 text-sm text-muted transition hover:text-foreground',
            topic.topic_id === selectedTopicId && 'border-accent font-bold text-foreground'
          )}
        >
          # {topic.title}
        </button>
      ))}
    </div>
  );
};
