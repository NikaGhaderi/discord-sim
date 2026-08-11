import React, { useEffect, ReactNode } from 'react';
import { socketClient } from './index';

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  useEffect(() => {
    socketClient.connect();
    return () => socketClient.disconnect();
  }, []);

  return <>{children}</>;
};
