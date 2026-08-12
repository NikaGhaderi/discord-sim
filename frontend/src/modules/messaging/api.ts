import { apiClient } from '../../infrastructure/apiClient';
import { MediaSummary, Message } from './types';

export interface MediaAttachment {
  media_id: number;
  base_message_id: number;
  file_url: string;
  file_type: string;
  file_size: number;
  thumbnail_url: string | null;
}

export interface PaginatedMessagesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Message[];
}

/** Exactly one of these must be set -- mirrors the backend's target invariant. */
export interface MessageTarget {
  topic_id?: number;
  group_id?: number;
  direct_chat_id?: number;
}

export interface SendMessagePayload extends MessageTarget {
  content: string;
}

export interface SearchMessagesParams extends MessageTarget {
  query: string;
  limit?: number;
  offset?: number;
}

interface RawMessage {
  base_message_id: number;
  sender_id: number;
  content: string;
  sent_at: string;
  is_edited: boolean;
  media?: MediaSummary[];
}

interface RawPaginatedMessagesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: RawMessage[];
}

/** The backend doesn't return a display name on message payloads (WS or
 * REST) -- this placeholder matches the fallback already used for live
 * WebSocket pushes in MessageThread. */
function toMessage(raw: RawMessage): Message {
  return {
    base_message_id: raw.base_message_id,
    sender_id: raw.sender_id,
    sender_username: `User #${raw.sender_id}`,
    content: raw.content,
    sent_at: raw.sent_at,
    is_edited: raw.is_edited,
    media: raw.media ?? [],
  };
}

function toPaginatedMessages(
  raw: RawPaginatedMessagesResponse
): PaginatedMessagesResponse {
  return { ...raw, results: raw.results.map(toMessage) };
}

export const messagingApi = {
  sendMessage: async (payload: SendMessagePayload): Promise<Message> => {
    const response = await apiClient.post<RawMessage>('/api/messages/', payload);
    return toMessage(response.data);
  },

  listMessages: async (
    target: MessageTarget,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaginatedMessagesResponse> => {
    const response = await apiClient.get<RawPaginatedMessagesResponse>('/api/messages/', {
      params: { ...target, limit, offset },
    });
    return toPaginatedMessages(response.data);
  },

  editMessage: async (messageId: number, content: string): Promise<Message> => {
    const response = await apiClient.patch<RawMessage>(`/api/messages/${messageId}/`, {
      content,
    });
    return toMessage(response.data);
  },

  deleteMessage: async (messageId: number): Promise<void> => {
    await apiClient.delete(`/api/messages/${messageId}/`);
  },

  attachMedia: async (messageId: number, file: File): Promise<MediaAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<MediaAttachment>(
      `/api/messages/${messageId}/media/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  searchMessages: async (params: SearchMessagesParams): Promise<PaginatedMessagesResponse> => {
    const { query, limit = 50, offset = 0, ...target } = params;
    const response = await apiClient.get<RawPaginatedMessagesResponse>(
      '/api/messages/search/',
      { params: { q: query, ...target, limit, offset } }
    );
    return toPaginatedMessages(response.data);
  },
};
