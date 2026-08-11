import React from 'react';
import { MessageThread } from '../components/MessageThread';

export const ChannelThreadPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-gray-900 text-white flex-1">
      <header className="border-b border-gray-800 p-4 font-bold text-lg">
        # general
      </header>
      
      <MessageThread />
    </div>
  );
};

export default ChannelThreadPage;