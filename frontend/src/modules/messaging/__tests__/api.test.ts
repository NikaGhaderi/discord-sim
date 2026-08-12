import { describe, it, expect, vi, beforeEach } from 'vitest';
import { messagingApi } from '../api';
import { mockMessagingApi } from '../mockApi';
import { apiClient } from '../../../infrastructure/apiClient';

vi.mock('../../../infrastructure/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('SCRUM-45 Messaging Network Layer Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Real API Integration (messagingApi)', () => {
    it('sends a message via POST', async () => {
      const mockPayload = { topic_id: 'topic-1', content: 'Hello World' };
      const mockResponse = { data: { base_message_id: '1', ...mockPayload, sender_id: 'u1' } };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await messagingApi.sendMessage(mockPayload);
      expect(apiClient.post).toHaveBeenCalledWith('/api/messaging/messages/', mockPayload);
      expect(result).toEqual(mockResponse.data);
    });

    it('fetches paginated messages via GET', async () => {
      const mockData = { count: 1, next: null, previous: null, results: [] };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

      const result = await messagingApi.listMessages('topic-1', 10, 0);
      expect(apiClient.get).toHaveBeenCalledWith('/api/messaging/messages/', {
        params: { topic_id: 'topic-1', limit: 10, offset: 0 },
      });
      expect(result).toEqual(mockData);
    });

    it('uploads media attachment via FormData', async () => {
      const mockAttachment = { id: 'att-1', file_url: 'http://test.com', file_type: 'image/png', file_size: 100 };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockAttachment });

      const dummyFile = new File(['content'], 'test.png', { type: 'image/png' });
      const result = await messagingApi.attachMedia('msg-1', dummyFile);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/messaging/messages/msg-1/attachments/',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
      expect(result).toEqual(mockAttachment);
    });
  });

  describe('Mock API Parity Check (mockMessagingApi)', () => {
    it('sends message and updates mock store', async () => {
      const msg = await mockMessagingApi.sendMessage({ topic_id: 't1', content: 'New Mock Msg' });
      expect(msg.content).toBe('New Mock Msg');

      const list = await mockMessagingApi.listMessages('t1');
      expect(list.results.some((m) => m.base_message_id === msg.base_message_id)).toBe(true);
    });

    it('searches messages matching query', async () => {
      await mockMessagingApi.sendMessage({ topic_id: 't1', content: 'UniqueSearchTerm' });
      const results = await mockMessagingApi.searchMessages('UniqueSearchTerm');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('UniqueSearchTerm');
    });
  });
});