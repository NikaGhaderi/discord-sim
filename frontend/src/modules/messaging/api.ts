import { apiClient } from '../../infrastructure/apiClient';

export interface MediaAttachment {
  id: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export interface Message {
  base_message_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  is_edited?: boolean;
  attachments?: MediaAttachment[];
}

export interface PaginatedMessagesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Message[];
}

export interface SendMessagePayload {
  topic_id: string;
  content: string;
}

export interface ScheduledMessage {
  id: string;
  topic_id: string;
  content: string;
  scheduled_at: string;
}

export interface CreateScheduledMessagePayload {
  topic_id: string;
  content: string;
  scheduled_at: string;
}

export const messagingApi = {
  sendMessage: async (payload: SendMessagePayload): Promise<Message> => {
    const response = await apiClient.post<Message>('/api/messaging/messages/', payload);
    return response.data;
  },

  listMessages: async (
    topicId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedMessagesResponse> => {
    const response = await apiClient.get<PaginatedMessagesResponse>('/api/messaging/messages/', {
      params: { topic_id: topicId, limit, offset },
    });
    return response.data;
  },

  editMessage: async (messageId: string, content: string): Promise<Message> => {
    const response = await apiClient.patch<Message>(`/api/messaging/messages/${messageId}/`, {
      content,
    });
    return response.data;
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await apiClient.delete(`/api/messaging/messages/${messageId}/`);
  },

  attachMedia: async (messageId: string, file: File): Promise<MediaAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<MediaAttachment>(
      `/api/messaging/messages/${messageId}/attachments/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  searchMessages: async (query: string, groupId?: string): Promise<Message[]> => {
    const response = await apiClient.get<Message[]>('/api/messaging/messages/search/', {
      params: { q: query, group_id: groupId },
    });
    return response.data;
  },

  createScheduledMessage: async (payload: CreateScheduledMessagePayload): Promise<ScheduledMessage> => {
    const response = await apiClient.post<ScheduledMessage>('/api/messaging/scheduled-messages/', payload);
    return response.data;
  },

  cancelScheduledMessage: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/messaging/scheduled-messages/${id}/`);
  },

  listScheduledMessages: async (topicId?: string): Promise<ScheduledMessage[]> => {
    const response = await apiClient.get<ScheduledMessage[]>('/api/messaging/scheduled-messages/', {
      params: { topic_id: topicId },
    });
    return response.data;
  },
};