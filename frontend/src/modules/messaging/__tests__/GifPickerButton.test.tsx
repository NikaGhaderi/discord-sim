import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GifPickerButton } from '../components/GifPickerButton';

function mockGiphyResponse(gifs: Array<{ id: string; title: string }>) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        data: gifs.map((g) => ({
          id: g.id,
          title: g.title,
          images: {
            fixed_height_small: { url: `https://media.giphy.com/${g.id}/preview.gif` },
            original: { url: `https://media.giphy.com/${g.id}/original.gif` },
          },
        })),
      }),
  };
}

describe('GifPickerButton', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('shows a setup message instead of searching when no API key is configured', async () => {
    vi.stubEnv('VITE_GIPHY_API_KEY', '');

    render(<GifPickerButton onSelectGif={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Add GIF'));

    expect(await screen.findByText(/free Giphy API key/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('loads trending GIFs on open and selecting one calls onSelectGif with the full-size URL', async () => {
    vi.stubEnv('VITE_GIPHY_API_KEY', 'test-key');
    vi.mocked(fetch).mockResolvedValueOnce(
      mockGiphyResponse([{ id: 'abc', title: 'Cool Gif' }]) as never
    );
    const onSelectGif = vi.fn();

    render(<GifPickerButton onSelectGif={onSelectGif} />);
    fireEvent.click(screen.getByLabelText('Add GIF'));

    expect(await screen.findByLabelText('Cool Gif')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('trending'),
      expect.anything()
    );

    fireEvent.click(screen.getByLabelText('Cool Gif'));

    expect(onSelectGif).toHaveBeenCalledWith('https://media.giphy.com/abc/original.gif');
  });

  it('searches by query after debounce', async () => {
    vi.stubEnv('VITE_GIPHY_API_KEY', 'test-key');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(fetch).mockResolvedValue(mockGiphyResponse([]) as never);

    render(<GifPickerButton onSelectGif={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Add GIF'));
    fireEvent.change(screen.getByPlaceholderText('Search GIFs...'), {
      target: { value: 'cats' },
    });

    await vi.advanceTimersByTimeAsync(500);

    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('q=cats'),
      expect.anything()
    );
    vi.useRealTimers();
  });

  it('shows an error message when the request fails', async () => {
    vi.stubEnv('VITE_GIPHY_API_KEY', 'test-key');
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as never);

    render(<GifPickerButton onSelectGif={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Add GIF'));

    expect(await screen.findByText('Failed to load GIFs.')).toBeInTheDocument();
  });

  it('loads more GIFs when scrolled to the bottom of the grid', async () => {
    vi.stubEnv('VITE_GIPHY_API_KEY', 'test-key');
    const firstPage = Array.from({ length: 15 }, (_, i) => ({ id: `p1-${i}`, title: `Gif ${i}` }));
    const secondPage = [{ id: 'p2-0', title: 'Next Page Gif' }];
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockGiphyResponse(firstPage) as never)
      .mockResolvedValueOnce(mockGiphyResponse(secondPage) as never);

    render(<GifPickerButton onSelectGif={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Add GIF'));
    await screen.findByLabelText('Gif 0');
    expect(fetch).toHaveBeenCalledTimes(1);

    const grid = screen.getByLabelText('Gif 0').closest('div[style*="grid"]') as HTMLElement;
    Object.defineProperty(grid, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(grid, 'clientHeight', { value: 300, configurable: true });
    Object.defineProperty(grid, 'scrollTop', { value: 690, configurable: true });
    fireEvent.scroll(grid);

    expect(await screen.findByLabelText('Next Page Gif')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('offset=15'));
  });

  it('is disabled when disabled is true', () => {
    render(<GifPickerButton onSelectGif={vi.fn()} disabled />);
    expect(screen.getByLabelText('Add GIF')).toBeDisabled();
  });
});
