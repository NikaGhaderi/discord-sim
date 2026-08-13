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
  /** When provided, search is delegated to this (e.g. the real backend's
   * full-text search) instead of filtering mockData locally. */
  searchFn?: (query: string) => Promise<SearchResultItem[]>;
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
  searchFn,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    if (searchFn) {
      const found = await searchFn(trimmed);
      setResults(found);
      setHasSearched(true);
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
          required
          className="flex-1 px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 border-[var(--ws-border)] text-[var(--ws-text)] bg-[var(--ws-bg)] focus:ring-[var(--ws-primary)]"
          aria-label="Search Messages"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-50 bg-[var(--ws-primary)] text-[var(--ws-text-on-bubble)] hover:bg-[var(--ws-primary-hover)]"
        >
          Search
        </button>
      </form>

      {hasSearched && (
        <div className="flex flex-col gap-1 mt-2 border rounded-md p-2 max-h-60 overflow-y-auto border-[var(--ws-border)] bg-[var(--ws-bg)]">
          {results.length === 0 ? (
            <p className="text-xs p-2 text-center text-[var(--ws-text-secondary)]">No results found.</p>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                onClick={() => onResultClick?.(item)}
                className="p-2 rounded cursor-pointer border-b last:border-0 hover:bg-[var(--ws-bg-hover)] border-[var(--ws-border)]"
                data-testid="search-result-item"
              >
                <div className="flex justify-between items-center text-xs mb-1 text-[var(--ws-text-secondary)]">
                  <span className="font-semibold text-[var(--ws-text)]">{item.sender}</span>
                  <span>{item.timestamp}</span>
                </div>
                <p className="text-xs line-clamp-2 text-[var(--ws-text)]">{item.snippet}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};