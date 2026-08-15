/**
 * index — picks between the real implementation and the mock one.
 *
 * Consumers should use `messagingApi` from this file, never api.ts or
 * mockApi.ts directly. That way the mock/real switch is a single env var
 * and the rest of the code never changes.
 */

import * as realApi from './api';
import * as mockApi from './mockApi';

const useMock = import.meta.env.VITE_USE_MOCK_API === 'true';

export const messagingApi = useMock ? mockApi.mockMessagingApi : realApi.messagingApi;

export type {
  MediaAttachment,
  PaginatedMessagesResponse,
  MessageTarget,
  SendMessagePayload,
  ScheduledMessage,
  CreateScheduledMessagePayload,
  SearchMessagesParams,
} from './api';
export * from './types';
