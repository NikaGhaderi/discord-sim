import React, { useEffect, ReactNode } from 'react';
import { socketClient } from './index';
import { useAuth } from '../identity/context';

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  // Connecting unconditionally on mount (the old behavior) opened a socket
  // with no token before the user had even logged in -- guaranteed
  // rejected by JWTAuthMiddleware (anonymous scope.user), which surfaced as
  // a WebSocket error in the browser console and WSREJECT/403 in the
  // backend logs on every page load, self-healing only once the 2s
  // reconnect loop happened to land after a token existed. Gating on
  // isAuthenticated means it only ever connects with a real token, and
  // disconnects cleanly on logout instead of retrying against a now-stale one.
  useEffect(() => {
    if (!isAuthenticated) {
      socketClient.disconnect();
      return;
    }
    socketClient.connect();
    return () => socketClient.disconnect();
  }, [isAuthenticated]);

  return <>{children}</>;
};
