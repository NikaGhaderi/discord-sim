import { Message } from './types';
import {
  MediaAttachment,
  MessageTarget,
  PaginatedMessagesResponse,
  SearchMessagesParams,
  SendMessagePayload,
} from './api';

let nextMessageId = 101;
let nextMediaId = 1;

const mockMessagesStore: Message[] = [
  {
    base_message_id: nextMessageId++,
    sender_id: 1,
    sender_username: 'nika_lead',
    content: 'Welcome to the channel!',
    sent_at: new Date(Date.now() - 3600000).toISOString(),
    is_edited: false,
    media: [],
  },
  {
    base_message_id: nextMessageId++,
    sender_id: 2,
    sender_username: 'ftm_roosta',
    content: 'Thanks! Excited to be here.',
    sent_at: new Date(Date.now() - 1800000).toISOString(),
    is_edited: true,
    media: [{ file_url: 'https://example.com/sample.png', file_type: 'image/png' }],
  },
];

function matchesTarget(message: Message, target: MessageTarget): boolean {
  // The mock store doesn't track per-message targets -- every mock message
  // is visible regardless of which target was requested, same as the real
  // backend would be for a single populated space.
  void message;
  void target;
  return true;
}

function paginate(messages: Message[], limit: number, offset: number): PaginatedMessagesResponse {
  const sliced = messages.slice(offset, offset + limit);
  return {
    count: messages.length,
    next: offset + limit < messages.length ? 'next-link' : null,
    previous: offset > 0 ? 'prev-link' : null,
    results: sliced,
  };
}

export const mockMessagingApi = {
  sendMessage: async (payload: SendMessagePayload): Promise<Message> => {
    const newMsg: Message = {
      base_message_id: nextMessageId++,
      sender_id: 1,
      sender_username: 'current-user',
      content: payload.content,
      sent_at: new Date().toISOString(),
      is_edited: false,
      media: [],
    };
    mockMessagesStore.push(newMsg);
    return Promise.resolve(newMsg);
  },

  listMessages: async (
    target: MessageTarget,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaginatedMessagesResponse> => {
    const filtered = mockMessagesStore.filter((m) => matchesTarget(m, target));
    return Promise.resolve(paginate(filtered, limit, offset));
  },

  editMessage: async (messageId: number, content: string): Promise<Message> => {
    const msg = mockMessagesStore.find((m) => m.base_message_id === messageId);
    if (!msg) {
      throw new Error('Message not found');
    }
    msg.content = content;
    msg.is_edited = true;
    return Promise.resolve({ ...msg });
  },

  deleteMessage: async (messageId: number): Promise<void> => {
    const index = mockMessagesStore.findIndex((m) => m.base_message_id === messageId);
    if (index !== -1) {
      mockMessagesStore.splice(index, 1);
    }
    return Promise.resolve();
  },

  attachMedia: async (messageId: number, file: File): Promise<MediaAttachment> => {
    const msg = mockMessagesStore.find((m) => m.base_message_id === messageId);
    if (!msg) {
      throw new Error('Message not found');
    }
    const attachment: MediaAttachment = {
      media_id: nextMediaId++,
      base_message_id: messageId,
      file_url: URL.createObjectURL(file),
      file_type: file.type,
      file_size: file.size,
      thumbnail_url: null,
    };
    msg.media = [...(msg.media ?? []), { file_url: attachment.file_url, file_type: attachment.file_type }];
    return Promise.resolve(attachment);
  },

  searchMessages: async (params: SearchMessagesParams): Promise<PaginatedMessagesResponse> => {
    const { query, limit = 50, offset = 0, ...target } = params;
    const trimmed = query.trim();
    if (!trimmed) {
      return Promise.resolve(paginate([], limit, offset));
    }
    const matches = mockMessagesStore.filter(
      (m) => matchesTarget(m, target) && m.content.toLowerCase().includes(trimmed.toLowerCase())
    );
    return Promise.resolve(paginate(matches, limit, offset));
  },
};
