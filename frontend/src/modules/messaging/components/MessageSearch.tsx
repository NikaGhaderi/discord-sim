import React, { useState } from 'react';

interface MessageSearchProps {
  onSearch: (query: string) => void;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSearch} className="message-search-bar">
      <input
        type="search"
        placeholder="Search messages..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value === '') onSearch('');
        }}
      />
      <button type="submit">Search</button>
    </form>
  );
};