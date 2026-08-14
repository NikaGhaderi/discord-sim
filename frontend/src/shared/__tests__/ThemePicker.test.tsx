import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemePicker } from '../components/ThemePicker';
import { PALETTES } from '../theme/palettes';
import { getStoredPaletteName } from '../theme/applyPalette';

describe('ThemePicker', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('lists every supported palette by name with one color circle per swatch', () => {
    render(<ThemePicker onClose={() => {}} />);

    for (const palette of PALETTES) {
      expect(screen.getByText(palette.name)).toBeInTheDocument();
    }
    // Spot-check one palette's circle count matches its swatch count.
    const graphite = PALETTES.find((p) => p.name === 'Graphite')!;
    const button = screen.getByRole('button', { name: new RegExp(graphite.name) });
    expect(button.querySelectorAll('span > span')).toHaveLength(graphite.colors.length);
  });

  it('applies and persists the selected palette when clicked', () => {
    render(<ThemePicker onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Vivid and Sharp/ }));

    expect(getStoredPaletteName()).toBe('Vivid and Sharp');
    expect(
      document.documentElement.style.getPropertyValue('--ws-bg').trim()
    ).not.toBe('');
  });

  it('closes via the modal close button', () => {
    let closed = false;
    render(<ThemePicker onClose={() => { closed = true; }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(closed).toBe(true);
  });
});
