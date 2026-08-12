import {
  Message,
  PaginatedMessagesResponse,
  SendMessagePayload,
  MediaAttachment,
  ScheduledMessage,
  CreateScheduledMessagePayload,
} from './api';

const mockMessagesStore: Message[] = [
  {
    base_message_id: 'msg-101',
    sender_id: 'user-1',
    content: 'Welcome to the channel!',
    sent_at: new Date(Date.now() - 3600000).toISOString(),
    is_edited: false,
    attachments: [],
  },
];

const mockScheduledMessagesStore: ScheduledMessage[] = [];

export const mockMessagingApi = {
  sendMessage: async (payload: SendMessagePayload): Promise<Message> => {
    const newMsg: Message = {
      base_message_id: `msg-${Date.now()}`,
      sender_id: 'current-user-id',
      content: payload.content,
      sent_at: new Date().toISOString(),
      is_edited: false,
      attachments: [],
    };
    mockMessagesStore.push(newMsg);
    return Promise.resolve(newMsg);
  },

  listMessages: async (
    _topicId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedMessagesResponse> => {
    const sliced = mockMessagesStore.slice(offset, offset + limit);
    return Promise.resolve({
      count: mockMessagesStore.length,
      next: offset + limit < mockMessagesStore.length ? 'next-link' : null,
      previous: offset > 0 ? 'prev-link' : null,
      results: sliced,
    });
  },

  editMessage: async (messageId: string, content: string): Promise<Message> => {
    const msg = mockMessagesStore.find((m) => m.base_message_id === messageId);
    if (!msg) {
      throw new Error('Message not found');
    }
    msg.content = content;
    msg.is_edited = true;
    return Promise.resolve({ ...msg });
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    const index = mockMessagesStore.findIndex((m) => m.base_message_id === messageId);
    if (index !== -1) {
      mockMessagesStore.splice(index, 1);
    }
    return Promise.resolve();
  },

  attachMedia: async (messageId: string, file: File): Promise<MediaAttachment> => {
    const msg = mockMessagesStore.find((m) => m.base_message_id === messageId);
    const attachment: MediaAttachment = {
      id: `att-${Date.now()}`,
      file_url: URL.createObjectURL(file),
      file_type: file.type,
      file_size: file.size,
    };
    if (msg) {
      msg.attachments = msg.attachments || [];
      msg.attachments.push(attachment);
    }
    return Promise.resolve(attachment);
  },

  searchMessages: async (query: string, _groupId?: string): Promise<Message[]> => {
    if (!query.trim()) return Promise.resolve([]);
    const matches = mockMessagesStore.filter((m) =>
      m.content.toLowerCase().includes(query.toLowerCase())
    );
    return Promise.resolve(matches);
  },

  createScheduledMessage: async (payload: CreateScheduledMessagePayload): Promise<ScheduledMessage> => {
    const scheduled: ScheduledMessage = {
      id: `sched-${Date.now()}`,
      topic_id: payload.topic_id,
      content: payload.content,
      scheduled_at: payload.scheduled_at,
    };
    mockScheduledMessagesStore.push(scheduled);
    return Promise.resolve(scheduled);
  },

  cancelScheduledMessage: async (id: string): Promise<void> => {
    const index = mockScheduledMessagesStore.findIndex((s) => s.id === id);
    if (index !== -1) {
      mockScheduledMessagesStore.splice(index, 1);
    }
    return Promise.resolve();
  },

  listScheduledMessages: async (topicId?: string): Promise<ScheduledMessage[]> => {
    if (topicId) {
      return Promise.resolve(mockScheduledMessagesStore.filter((s) => s.topic_id === topicId));
    }
    return Promise.resolve([...mockScheduledMessagesStore]);
  },
};