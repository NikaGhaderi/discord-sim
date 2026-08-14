import React, { useEffect, useRef, useState } from 'react';

interface GifPickerButtonProps {
  onSelectGif: (url: string) => void;
  disabled?: boolean;
}

interface GifResult {
  id: string;
  previewUrl: string;
  fullUrl: string;
  title: string;
}

/**
 * Giphy's old public "beta" demo key (dc6zaTOxFJmzC), commonly used in
 * tutorials for exactly this purpose, now returns 403 BANNED server-side --
 * Giphy retired it after years of abuse. There is no working no-signup
 * public key anymore (Tenor's equivalent v1 demo key suffered the same
 * fate, and v2 requires a real Google Cloud API key). A real key is free
 * and takes about two minutes: developers.giphy.com -> create an app -> API
 * key -> put it in frontend/.env as VITE_GIPHY_API_KEY=<key>.
 *
 * Read inside the component (not hoisted to a module-level constant) so
 * tests can stub it per-case with vi.stubEnv -- a module-level constant
 * would freeze whatever value was present at first import.
 */
function getApiKey(): string | undefined {
  return import.meta.env.VITE_GIPHY_API_KEY as string | undefined;
}

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE = 15;
// How close to the bottom (in px) of the scrollable grid before the next
// page is requested.
const LOAD_MORE_THRESHOLD_PX = 40;

function buildEndpoint(apiKey: string, query: string, offset: number): string {
  return query.trim()
    ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(
        query.trim()
      )}&limit=${PAGE_SIZE}&offset=${offset}&rating=pg-13`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${PAGE_SIZE}&offset=${offset}&rating=pg-13`;
}

function toGifResults(data: unknown[]): GifResult[] {
  return data.map((item) => {
    const gif = item as {
      id: string;
      title: string;
      images: {
        fixed_height_small: { url: string };
        original: { url: string };
      };
    };
    return {
      id: gif.id,
      title: gif.title,
      previewUrl: gif.images.fixed_height_small.url,
      fullUrl: gif.images.original.url,
    };
  });
}

export const GifPickerButton: React.FC<GifPickerButtonProps> = ({
  onSelectGif,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GifResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiKey = getApiKey();

  // A fresh search (new query, or first open) always starts at offset 0 and
  // replaces the results; scrolling further pages in via loadMore below.
  useEffect(() => {
    if (!isOpen) return;
    if (!apiKey) return;

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      fetch(buildEndpoint(apiKey, query, 0), { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`Giphy request failed (${res.status})`);
          return res.json();
        })
        .then((json) => {
          const page = toGifResults(json.data ?? []);
          setResults(page);
          setHasMore(page.length === PAGE_SIZE);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') setError('Failed to load GIFs.');
        })
        .finally(() => setIsLoading(false));
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, query, apiKey]);

  const loadMore = () => {
    if (!apiKey || isLoading || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    fetch(buildEndpoint(apiKey, query, results.length))
      .then((res) => {
        if (!res.ok) throw new Error(`Giphy request failed (${res.status})`);
        return res.json();
      })
      .then((json) => {
        const page = toGifResults(json.data ?? []);
        setResults((prev) => [...prev, ...page]);
        setHasMore(page.length === PAGE_SIZE);
      })
      .catch(() => {
        // Non-fatal -- whatever's already loaded stays visible; the user
        // can just stop scrolling rather than seeing an error takeover.
      })
      .finally(() => setIsLoadingMore(false));
  };

  const handleGridScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_THRESHOLD_PX) {
      loadMore();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (gif: GifResult) => {
    onSelectGif(gif.fullUrl);
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setHasMore(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        disabled={disabled}
        className="p-2 border rounded-md text-sm font-medium disabled:opacity-50 text-[var(--ws-text-secondary)] border-[var(--ws-border)] hover:text-[var(--ws-primary)]"
        aria-label="Add GIF"
      >
        GIF
      </button>

      {isOpen && (
        <div
          className="modal-card"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 8,
            width: 320,
            maxHeight: 380,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 20,
          }}
        >
          {!apiKey ? (
            <p className="list-row-subtitle">
              GIF search needs a free Giphy API key. Get one at developers.giphy.com and set
              VITE_GIPHY_API_KEY in the frontend&apos;s .env file.
            </p>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search GIFs..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
              />
              {isLoading && <p className="list-row-subtitle">Loading...</p>}
              {error && <p role="alert">{error}</p>}
              {!isLoading && !error && results.length === 0 && (
                <p className="list-row-subtitle">No GIFs found.</p>
              )}
            </>
          )}
          <div
            onScroll={handleGridScroll}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 4,
              overflowY: 'auto',
            }}
          >
            {results.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => handleSelect(gif)}
                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                aria-label={gif.title || 'Select GIF'}
              >
                <img
                  src={gif.previewUrl}
                  alt={gif.title}
                  style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 4 }}
                />
              </button>
            ))}
          </div>
          {isLoadingMore && (
            <p className="list-row-subtitle" style={{ textAlign: 'center', marginTop: 4 }}>
              Loading more...
            </p>
          )}
        </div>
      )}
    </div>
  );
};
