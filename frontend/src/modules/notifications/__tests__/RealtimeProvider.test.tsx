import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealtimeProvider } from '../RealtimeProvider';
import { socketClient } from '../index';
import { useAuth } from '../../identity/context';

vi.mock('../index', () => ({
  socketClient: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

vi.mock('../../identity/context', () => ({
  useAuth: vi.fn(),
}));

describe('RealtimeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not connect while unauthenticated (e.g. on the login page, before a token exists)', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);

    render(
      <RealtimeProvider>
        <div>child</div>
      </RealtimeProvider>
    );

    expect(socketClient.connect).not.toHaveBeenCalled();
  });

  it('connects once authenticated, and disconnects on unmount', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);

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

  it('disconnects when auth flips from true to false (e.g. logout), without reconnecting', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);

    const { rerender } = render(
      <RealtimeProvider>
        <div>child</div>
      </RealtimeProvider>
    );
    expect(socketClient.connect).toHaveBeenCalledTimes(1);

    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);
    rerender(
      <RealtimeProvider>
        <div>child</div>
      </RealtimeProvider>
    );

    expect(socketClient.connect).toHaveBeenCalledTimes(1);
    expect(socketClient.disconnect).toHaveBeenCalled();
  });
});
