import React, { useState } from 'react';

export interface SearchResultItem {
  id: string;
  sender: string;
  timestamp: string;
  snippet: string;
}

interface SearchBarProps {
  mockData?: SearchResultItem[];
  onResultClick?: (item: SearchResultItem) => void;
}

const DEFAULT_MOCK_RESULTS: SearchResultItem[] = [
  {
    id: '1',
    sender: 'Alice',
    timestamp: '10:30 AM',
    snippet: 'Hey team, let us review the deployment process.',
  },
  {
    id: '2',
    sender: 'Bob',
    timestamp: '10:35 AM',
    snippet: 'The deployment is scheduled for 2 PM today.',
  },
  {
    id: '3',
    sender: 'Charlie',
    timestamp: '11:00 AM',
    snippet: 'Did anyone test the new search UI?',
  },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  mockData = DEFAULT_MOCK_RESULTS,
  onResultClick,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const filtered = mockData.filter(
      (item) =>
        item.snippet.toLowerCase().includes(trimmed.toLowerCase()) ||
        item.sender.toLowerCase().includes(trimmed.toLowerCase())
    );

    setResults(filtered);
    setHasSearched(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      setHasSearched(false);
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-2 p-2">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search messages..."
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Search Messages"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          Search
        </button>
      </form>

      {hasSearched && (
        <div className="flex flex-col gap-1 mt-2 border border-gray-200 rounded-md p-2 bg-white max-h-60 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-xs text-gray-500 p-2 text-center">No results found.</p>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                onClick={() => onResultClick?.(item)}
                className="p-2 hover:bg-gray-50 rounded cursor-pointer border-b border-gray-100 last:border-0"
                data-testid="search-result-item"
              >
                <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                  <span className="font-semibold text-gray-800">{item.sender}</span>
                  <span>{item.timestamp}</span>
                </div>
                <p className="text-xs text-gray-700 line-clamp-2">{item.snippet}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};