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
    // jsdom doesn't implement createObjectURL; mockApi's attachMedia calls
    // it to build a real-looking local preview URL for the selected file.
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock-url') });
  });

  describe('Real API Integration (messagingApi)', () => {
    it('sends a message via POST to /api/messages/', async () => {
      const payload = { topic_id: 5, content: 'Hello World' };
      const raw = {
        base_message_id: 1,
        sender_id: 10,
        content: 'Hello World',
        sent_at: '2026-01-01T00:00:00Z',
        is_edited: false,
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: raw });

      const result = await messagingApi.sendMessage(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/api/messages/', payload);
      expect(result).toEqual({
        base_message_id: 1,
        sender_id: 10,
        sender_username: 'User #10',
        content: 'Hello World',
        sent_at: '2026-01-01T00:00:00Z',
        is_edited: false,
        media: [],
      });
    });

    it('fetches paginated messages scoped by target, with media passed through', async () => {
      const rawResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            base_message_id: 1,
            sender_id: 10,
            content: 'hi',
            sent_at: '2026-01-01T00:00:00Z',
            is_edited: false,
            media: [{ file_url: '/media/a.png', file_type: 'image/png' }],
          },
        ],
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: rawResponse });

      const result = await messagingApi.listMessages({ topic_id: 5 }, 10, 0);

      expect(apiClient.get).toHaveBeenCalledWith('/api/messages/', {
        params: { topic_id: 5, limit: 10, offset: 0 },
      });
      expect(result.results[0].media).toEqual([
        { file_url: '/media/a.png', file_type: 'image/png' },
      ]);
      expect(result.count).toBe(1);
    });

    it('lists messages for a group target', async () => {
      const rawResponse = { count: 0, next: null, previous: null, results: [] };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: rawResponse });

      await messagingApi.listMessages({ group_id: 7 }, 50, 0);

      expect(apiClient.get).toHaveBeenCalledWith('/api/messages/', {
        params: { group_id: 7, limit: 50, offset: 0 },
      });
    });

    it('edits a message via PATCH', async () => {
      const raw = {
        base_message_id: 1,
        sender_id: 10,
        content: 'edited',
        sent_at: '2026-01-01T00:00:00Z',
        is_edited: true,
      };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: raw });

      const result = await messagingApi.editMessage(1, 'edited');

      expect(apiClient.patch).toHaveBeenCalledWith('/api/messages/1/', {
        content: 'edited',
      });
      expect(result.is_edited).toBe(true);
    });

    it('deletes a message via DELETE', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });

      await messagingApi.deleteMessage(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/api/messages/1/');
    });

    it('uploads a media attachment to /api/messages/{id}/media/', async () => {
      const mockAttachment = {
        media_id: 1,
        base_message_id: 1,
        file_url: 'http://test.com/a.png',
        file_type: 'image/png',
        file_size: 100,
        thumbnail_url: null,
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockAttachment });

      const dummyFile = new File(['content'], 'test.png', { type: 'image/png' });
      const result = await messagingApi.attachMedia(1, dummyFile);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/messages/1/media/',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
      expect(result).toEqual(mockAttachment);
    });

    it('searches messages via GET /api/messages/search/, scoped by target', async () => {
      const rawResponse = { count: 0, next: null, previous: null, results: [] };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: rawResponse });

      await messagingApi.searchMessages({ query: 'run', group_id: 7 });

      expect(apiClient.get).toHaveBeenCalledWith('/api/messages/search/', {
        params: { q: 'run', group_id: 7, limit: 50, offset: 0 },
      });
    });
  });

  describe('Mock API Parity Check (mockMessagingApi)', () => {
    it('sends message and updates mock store', async () => {
      const msg = await mockMessagingApi.sendMessage({ topic_id: 1, content: 'New Mock Msg' });
      expect(msg.content).toBe('New Mock Msg');
      expect(typeof msg.base_message_id).toBe('number');

      const list = await mockMessagingApi.listMessages({ topic_id: 1 });
      expect(list.results.some((m) => m.base_message_id === msg.base_message_id)).toBe(true);
    });

    it('edits and deletes a mock message', async () => {
      const msg = await mockMessagingApi.sendMessage({ topic_id: 1, content: 'Original' });

      const edited = await mockMessagingApi.editMessage(msg.base_message_id, 'Edited');
      expect(edited.content).toBe('Edited');
      expect(edited.is_edited).toBe(true);

      await mockMessagingApi.deleteMessage(msg.base_message_id);
      const list = await mockMessagingApi.listMessages({ topic_id: 1 });
      expect(list.results.some((m) => m.base_message_id === msg.base_message_id)).toBe(false);
    });

    it('attaches media and reflects it on the message', async () => {
      const msg = await mockMessagingApi.sendMessage({ topic_id: 1, content: 'With attachment' });
      const file = new File(['x'], 'a.png', { type: 'image/png' });

      const attachment = await mockMessagingApi.attachMedia(msg.base_message_id, file);
      expect(attachment.file_type).toBe('image/png');

      const list = await mockMessagingApi.listMessages({ topic_id: 1 });
      const stored = list.results.find((m) => m.base_message_id === msg.base_message_id);
      expect(stored?.media).toEqual([
        { file_url: attachment.file_url, file_type: 'image/png' },
      ]);
    });

    it('searches messages matching query', async () => {
      await mockMessagingApi.sendMessage({ topic_id: 1, content: 'UniqueSearchTerm' });
      const results = await mockMessagingApi.searchMessages({ query: 'UniqueSearchTerm' });
      expect(results.results.length).toBeGreaterThan(0);
      expect(results.results[0].content).toContain('UniqueSearchTerm');
    });

    it('returns no results for an empty query, not the full store', async () => {
      const results = await mockMessagingApi.searchMessages({ query: '   ' });
      expect(results.results).toEqual([]);
      expect(results.count).toBe(0);
    });
  });
});
