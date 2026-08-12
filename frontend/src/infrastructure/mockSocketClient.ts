import {
  MessageDeletedData,
  NewMessageData,
  NewNotificationData,
  SocketClient,
  Unsubscribe,
} from './socketClient';

let demoNotificationCounter = 0;
let demoMessageCounter = 0;

function buildDemoNotification(): NewNotificationData {
  demoNotificationCounter += 1;
  return {
    notification_id: 88 + demoNotificationCounter,
    event_type: 'NEW_MESSAGE',
    payload: { base_message_id: 1025 + demoNotificationCounter },
    is_read: false,
    created_at: new Date().toISOString(),
  };
}

function buildDemoMessage(): NewMessageData {
  demoMessageCounter += 1;
  return {
    base_message_id: 1025 + demoMessageCounter,
    sender_id: 3,
    content: `Anyone around for a quick sync? (#${demoMessageCounter})`,
    sent_at: new Date().toISOString(),
    is_edited: false,
    media: [],
  };
}

const NOTIFICATION_INTERVAL_MS = 6000;
const MESSAGE_INTERVAL_MS = 8000;

// Emits demo events on a repeating interval, not a one-shot timeout, so a UI
// that subscribes late (e.g. after navigating around) still sees a live push
// within a few seconds instead of only ever catching it once right after connect().
export class MockSocketClient implements SocketClient {
  private newMessageListeners = new Set<(data: NewMessageData) => void>();
  private messageDeletedListeners = new Set<(data: MessageDeletedData) => void>();
  private newNotificationListeners = new Set<(data: NewNotificationData) => void>();
  private intervals: ReturnType<typeof setInterval>[] = [];

  connect(): void {
    this.intervals.push(
      setInterval(() => {
        const notification = buildDemoNotification();
        this.newNotificationListeners.forEach((listener) => listener(notification));
      }, NOTIFICATION_INTERVAL_MS),
      setInterval(() => {
        const message = buildDemoMessage();
        this.newMessageListeners.forEach((listener) => listener(message));
      }, MESSAGE_INTERVAL_MS)
    );
  }

  disconnect(): void {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
  }

  // No real grouping in the mock -- every subscriber sees every demo event.
  subscribe(_groupName: string): void {}

  onNewMessage(handler: (data: NewMessageData) => void): Unsubscribe {
    this.newMessageListeners.add(handler);
    return () => this.newMessageListeners.delete(handler);
  }

  onMessageDeleted(handler: (data: MessageDeletedData) => void): Unsubscribe {
    this.messageDeletedListeners.add(handler);
    return () => this.messageDeletedListeners.delete(handler);
  }

  onNewNotification(handler: (data: NewNotificationData) => void): Unsubscribe {
    this.newNotificationListeners.add(handler);
    return () => this.newNotificationListeners.delete(handler);
  }
}
