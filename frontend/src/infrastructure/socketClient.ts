/**
 * socketClient — thin wrapper around the native WebSocket, matching the
 * real backend's protocol exactly:
 *
 *  - Auth: the token goes in a `?token=` query param (browsers can't set a
 *    custom header on a WS handshake), read by `core.ws_auth.JWTAuthMiddleware`.
 *  - Subscription model: the server does NOT broadcast a firehose. A client
 *    only receives events for a group (`topic_{id}` / `group_{id}` /
 *    `direct_chat_{id}`) after explicitly sending
 *    `{"action": "subscribe", "group": "<name>"}` -- see
 *    `apps.notifications.api.consumers.NotificationConsumer`. There is no
 *    server-side "unsubscribe"; once subscribed, a group stays subscribed
 *    until the socket disconnects entirely.
 *  - Payload shape: mirrors `_message_payload()`/the `Notification` model
 *    exactly -- no `topic_id`/`group_id`/`direct_chat_id` on the message
 *    events themselves, since routing is handled server-side by the group,
 *    not by a field the client has to filter on.
 */

import { getAccessToken } from './tokenStorage';

export interface MediaItem {
  file_url: string;
  file_type: string;
}

export interface NewMessageData {
  base_message_id: number;
  sender_id: number;
  content: string;
  sent_at: string;
  is_edited: boolean;
  media: MediaItem[];
}

export interface MessageDeletedData {
  base_message_id: number;
}

export interface NewNotificationData {
  notification_id: number;
  event_type: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

type Listener<T> = (data: T) => void;
export type Unsubscribe = () => void;

export interface SocketClient {
  connect(): void;
  disconnect(): void;
  /** Joins a room's group so its events start arriving. Idempotent. */
  subscribe(groupName: string): void;
  onNewMessage(handler: Listener<NewMessageData>): Unsubscribe;
  onMessageDeleted(handler: Listener<MessageDeletedData>): Unsubscribe;
  onNewNotification(handler: Listener<NewNotificationData>): Unsubscribe;
}

type IncomingPayload =
  | { event_type: 'NEW_MESSAGE'; data: NewMessageData }
  | { event_type: 'MESSAGE_DELETED'; data: MessageDeletedData }
  | { event_type: 'NEW_NOTIFICATION'; data: NewNotificationData };

function buildSocketUrl(): string {
  const httpBase: string = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  const wsBase = httpBase.replace(/^http/, 'ws');
  const token = getAccessToken();
  return token ? `${wsBase}/ws/stream/?token=${encodeURIComponent(token)}` : `${wsBase}/ws/stream/`;
}

const RECONNECT_DELAY_MS = 2000;

export class RealSocketClient implements SocketClient {
  private socket: WebSocket | null = null;
  private manuallyDisconnected = false;
  private pendingSubscriptions = new Set<string>();
  private newMessageListeners = new Set<Listener<NewMessageData>>();
  private messageDeletedListeners = new Set<Listener<MessageDeletedData>>();
  private newNotificationListeners = new Set<Listener<NewNotificationData>>();

  connect(): void {
    if (typeof WebSocket === 'undefined' || this.socket) return;
    this.manuallyDisconnected = false;
    this.openSocket();
  }

  private openSocket(): void {
    const socket = new WebSocket(buildSocketUrl());
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.pendingSubscriptions.forEach((groupName) => this.sendSubscribe(groupName));
    });
    socket.addEventListener('message', (event) => {
      this.handleMessage(event.data as string);
    });
    // Swallow errors -- the browser fires 'close' right after any error,
    // which is what actually drives the reconnect below. Without this
    // listener an unhandled 'error' event would surface as a console
    // exception for something that isn't fatal.
    socket.addEventListener('error', () => {});
    socket.addEventListener('close', () => {
      if (this.socket === socket) this.socket = null;
      if (!this.manuallyDisconnected) {
        setTimeout(() => {
          if (!this.manuallyDisconnected) this.openSocket();
        }, RECONNECT_DELAY_MS);
      }
    });
  }

  disconnect(): void {
    this.manuallyDisconnected = true;
    this.socket?.close();
    this.socket = null;
    this.pendingSubscriptions.clear();
  }

  subscribe(groupName: string): void {
    this.pendingSubscriptions.add(groupName);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(groupName);
    }
  }

  private sendSubscribe(groupName: string): void {
    this.socket?.send(JSON.stringify({ action: 'subscribe', group: groupName }));
  }

  private handleMessage(raw: string): void {
    let payload: IncomingPayload;
    try {
      payload = JSON.parse(raw) as IncomingPayload;
    } catch {
      return;
    }
    switch (payload.event_type) {
      case 'NEW_MESSAGE':
        this.newMessageListeners.forEach((listener) => listener(payload.data));
        break;
      case 'MESSAGE_DELETED':
        this.messageDeletedListeners.forEach((listener) => listener(payload.data));
        break;
      case 'NEW_NOTIFICATION':
        this.newNotificationListeners.forEach((listener) => listener(payload.data));
        break;
    }
  }

  onNewMessage(handler: Listener<NewMessageData>): Unsubscribe {
    this.newMessageListeners.add(handler);
    return () => this.newMessageListeners.delete(handler);
  }

  onMessageDeleted(handler: Listener<MessageDeletedData>): Unsubscribe {
    this.messageDeletedListeners.add(handler);
    return () => this.messageDeletedListeners.delete(handler);
  }

  onNewNotification(handler: Listener<NewNotificationData>): Unsubscribe {
    this.newNotificationListeners.add(handler);
    return () => this.newNotificationListeners.delete(handler);
  }
}
