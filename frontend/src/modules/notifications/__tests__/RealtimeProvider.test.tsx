import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RealtimeProvider } from '../RealtimeProvider';
import { socketClient } from '../index';

vi.mock('../index', () => ({
  socketClient: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

describe('RealtimeProvider', () => {
  it('connects the socket on mount and disconnects on unmount', () => {
    const { unmount } = render(
      <RealtimeProvider>
        <div>child</div>
      </RealtimeProvider>
    );

    expect(socketClient.connect).toHaveBeenCalledTimes(1);
    expect(socketClient.disconnect).not.toHaveBeenCalled();

    unmount();

    expect(socketClient.disconnect).toHaveBeenCalledTimes(1);
  });
});
