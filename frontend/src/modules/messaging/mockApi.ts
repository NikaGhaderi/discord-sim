import {
    Message,
    PaginatedMessagesResponse,
    SendMessagePayload,
    MediaAttachment,
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
    {
      base_message_id: 'msg-102',
      sender_id: 'user-2',
      content: 'Thanks! Excited to be here.',
      sent_at: new Date(Date.now() - 1800000).toISOString(),
      is_edited: true,
      attachments: [
        {
          id: 'att-1',
          file_url: 'https://example.com/sample.png',
          file_type: 'image/png',
          file_size: 2048,
        },
      ],
    },
  ];
  
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
  };