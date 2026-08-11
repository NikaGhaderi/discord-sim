import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockSocketClient } from '../mockSocketClient';

describe('MockSocketClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits demo NEW_MESSAGE events on a timer after connect', () => {
    const client = new MockSocketClient();
    const onNewMessage = vi.fn();
    client.onNewMessage(onNewMessage);

    client.connect();
    expect(onNewMessage).not.toHaveBeenCalled();

    vi.advanceTimersByTime(8000);
    expect(onNewMessage).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(8000);
    expect(onNewMessage).toHaveBeenCalledTimes(2);
  });

  it('emits demo NEW_NOTIFICATION events on a timer after connect', () => {
    const client = new MockSocketClient();
    const onNewNotification = vi.fn();
    client.onNewNotification(onNewNotification);

    client.connect();
    vi.advanceTimersByTime(6000);

    expect(onNewNotification).toHaveBeenCalledTimes(1);
  });

  it('stops emitting after disconnect', () => {
    const client = new MockSocketClient();
    const onNewMessage = vi.fn();
    client.onNewMessage(onNewMessage);

    client.connect();
    client.disconnect();
    vi.advanceTimersByTime(20000);

    expect(onNewMessage).not.toHaveBeenCalled();
  });

  it('subscribe is a harmless no-op', () => {
    const client = new MockSocketClient();
    expect(() => client.subscribe('topic_5')).not.toThrow();
  });

  it('an unsubscribe function stops further delivery', () => {
    const client = new MockSocketClient();
    const onNewMessage = vi.fn();
    const unsubscribe = client.onNewMessage(onNewMessage);
    unsubscribe();

    client.connect();
    vi.advanceTimersByTime(8000);

    expect(onNewMessage).not.toHaveBeenCalled();
  });
});
