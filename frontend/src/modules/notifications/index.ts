/**
 * index — picks between the real implementation and the mock one, for
 * both the REST notifications API and the WebSocket client. Consumers
 * should use `notificationsApi`/`socketClient` from this file, never
 * import api.ts/mockApi.ts or the infrastructure classes directly --
 * that way the mock/real switch is a single env var.
 */

import * as realApi from './api';
import * as mockApi from './mockApi';
import { RealSocketClient } from '@infrastructure/socketClient';
import { MockSocketClient } from '@infrastructure/mockSocketClient';
import type { NotificationsApi } from './api';
import type { SocketClient } from '@infrastructure/socketClient';

const useMock = import.meta.env.VITE_USE_MOCK_API === 'true';

export const notificationsApi: NotificationsApi = useMock ? mockApi : realApi;
export const socketClient: SocketClient = useMock ? new MockSocketClient() : new RealSocketClient();

export * from './api';
export * from './types';
export type { SocketClient, NewMessageData, MessageDeletedData, NewNotificationData, MediaItem } from '@infrastructure/socketClient';
