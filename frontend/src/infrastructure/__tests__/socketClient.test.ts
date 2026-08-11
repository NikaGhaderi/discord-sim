import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealSocketClient } from '../socketClient';
import { setTokens, clearTokens } from '../tokenStorage';

class FakeWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  private listeners: Record<string, ((event: unknown) => void)[]> = {};

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, handler: (event: unknown) => void) {
    (this.listeners[type] ??= []).push(handler);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.emit('close', {});
  }

  // --- test helpers, not part of the real WebSocket API ---
  emitOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.emit('open', {});
  }

  emitMessage(data: unknown) {
    this.emit('message', { data: JSON.stringify(data) });
  }

  emitRawMessage(raw: string) {
    this.emit('message', { data: raw });
  }

  emitError() {
    this.emit('error', {});
  }

  emitClose() {
    this.readyState = FakeWebSocket.CLOSED;
    this.emit('close', {});
  }

  private emit(type: string, event: unknown) {
    (this.listeners[type] ?? []).forEach((handler) => handler(event));
  }
}

describe('RealSocketClient', () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.WebSocket = FakeWebSocket as any;
    window.localStorage.clear();
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    vi.useRealTimers();
  });

  it('connects with the token in the query string when one exists', () => {
    setTokens({ access_token: 'tok-123', refresh_token: 'r' });
    const client = new RealSocketClient();

    client.connect();

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toContain('/ws/stream/?token=tok-123');
  });

  it('connects without a token param when unauthenticated', () => {
    clearTokens();
    const client = new RealSocketClient();

    client.connect();

    expect(FakeWebSocket.instances[0].url).not.toContain('token=');
  });

  it('does not open a second socket if already connected', () => {
    const client = new RealSocketClient();
    client.connect();
    client.connect();

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('queues a subscribe sent before open, and flushes it once open', () => {
    const client = new RealSocketClient();
    client.connect();
    client.subscribe('topic_5');

    const socket = FakeWebSocket.instances[0];
    expect(socket.sent).toHaveLength(0);

    socket.emitOpen();

    expect(socket.sent).toEqual([JSON.stringify({ action: 'subscribe', group: 'topic_5' })]);
  });

  it('sends a subscribe immediately if the socket is already open', () => {
    const client = new RealSocketClient();
    client.connect();
    const socket = FakeWebSocket.instances[0];
    socket.emitOpen();

    client.subscribe('topic_9');

    expect(socket.sent).toEqual([JSON.stringify({ action: 'subscribe', group: 'topic_9' })]);
  });

  it('dispatches NEW_MESSAGE only to onNewMessage listeners', () => {
    const client = new RealSocketClient();
    client.connect();
    const socket = FakeWebSocket.instances[0];

    const onNewMessage = vi.fn();
    const onMessageDeleted = vi.fn();
    const onNewNotification = vi.fn();
    client.onNewMessage(onNewMessage);
    client.onMessageDeleted(onMessageDeleted);
    client.onNewNotification(onNewNotification);

    socket.emitMessage({ event_type: 'NEW_MESSAGE', data: { base_message_id: 1 } });

    expect(onNewMessage).toHaveBeenCalledWith({ base_message_id: 1 });
    expect(onMessageDeleted).not.toHaveBeenCalled();
    expect(onNewNotification).not.toHaveBeenCalled();
  });

  it('dispatches MESSAGE_DELETED and NEW_NOTIFICATION to their own listeners', () => {
    const client = new RealSocketClient();
    client.connect();
    const socket = FakeWebSocket.instances[0];

    const onMessageDeleted = vi.fn();
    const onNewNotification = vi.fn();
    client.onMessageDeleted(onMessageDeleted);
    client.onNewNotification(onNewNotification);

    socket.emitMessage({ event_type: 'MESSAGE_DELETED', data: { base_message_id: 2 } });
    socket.emitMessage({
      event_type: 'NEW_NOTIFICATION',
      data: { notification_id: 1, event_type: 'NEW_MESSAGE', payload: {}, is_read: false, created_at: 'x' },
    });

    expect(onMessageDeleted).toHaveBeenCalledWith({ base_message_id: 2 });
    expect(onNewNotification).toHaveBeenCalledTimes(1);
  });

  it('ignores malformed JSON instead of throwing', () => {
    const client = new RealSocketClient();
    client.connect();
    const socket = FakeWebSocket.instances[0];
    const onNewMessage = vi.fn();
    client.onNewMessage(onNewMessage);

    expect(() => socket.emitRawMessage('not json')).not.toThrow();
    expect(onNewMessage).not.toHaveBeenCalled();
  });

  it('an unsubscribe function stops further delivery to that handler', () => {
    const client = new RealSocketClient();
    client.connect();
    const socket = FakeWebSocket.instances[0];
    const onNewMessage = vi.fn();
    const unsubscribe = client.onNewMessage(onNewMessage);

    unsubscribe();
    socket.emitMessage({ event_type: 'NEW_MESSAGE', data: { base_message_id: 1 } });

    expect(onNewMessage).not.toHaveBeenCalled();
  });

  it('does not throw when the socket errors', () => {
    const client = new RealSocketClient();
    client.connect();
    const socket = FakeWebSocket.instances[0];

    expect(() => socket.emitError()).not.toThrow();
  });

  it('reconnects automatically after the socket closes unexpectedly', () => {
    vi.useFakeTimers();
    const client = new RealSocketClient();
    client.connect();
    expect(FakeWebSocket.instances).toHaveLength(1);

    FakeWebSocket.instances[0].emitClose();
    expect(FakeWebSocket.instances).toHaveLength(1); // not yet -- reconnect is delayed

    vi.advanceTimersByTime(2000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('does not reconnect after an explicit disconnect', () => {
    vi.useFakeTimers();
    const client = new RealSocketClient();
    client.connect();
    client.disconnect();

    vi.advanceTimersByTime(5000);

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('re-sends all pending subscriptions after a reconnect', () => {
    vi.useFakeTimers();
    const client = new RealSocketClient();
    client.connect();
    client.subscribe('topic_5');
    FakeWebSocket.instances[0].emitOpen();

    FakeWebSocket.instances[0].emitClose();
    vi.advanceTimersByTime(2000);
    const secondSocket = FakeWebSocket.instances[1];
    secondSocket.emitOpen();

    expect(secondSocket.sent).toEqual([JSON.stringify({ action: 'subscribe', group: 'topic_5' })]);
  });
});
