import { describe, it, expect, beforeEach } from 'vitest';
import { deriveTheme, applyTheme, applyPaletteByName, getStoredPaletteName } from '../theme/applyPalette';
import { PALETTES } from '../theme/palettes';

function hexToRgbTuple(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function contrastRatio(hexA: string, hexB: string): number {
  const toLinear = (c: number) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  const lum = (hex: string) => {
    const [r, g, b] = hexToRgbTuple(hex);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };
  const l1 = lum(hexA) + 0.05;
  const l2 = lum(hexB) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

describe('deriveTheme', () => {
  it('produces every color token as a valid hex color, and a valid themeMode, for every supported palette', () => {
    for (const palette of PALETTES) {
      const theme = deriveTheme(palette.colors);
      for (const [key, value] of Object.entries(theme)) {
        if (key === 'themeMode') continue;
        expect(value).toMatch(/^#[0-9a-f]{6}$/i);
      }
      expect(['dark', 'light']).toContain(theme.themeMode);
    }
  });

  it('always keeps bg/text contrast at least readable, even for a near-monochrome light palette', () => {
    // Opaline: three near-white grays plus one vivid orange -- no strong
    // dark neutral at all, the exact case the contrast safety net (and the
    // light-chrome branch) exists for.
    const opaline = PALETTES.find((p) => p.name === 'Opaline')!;

    const theme = deriveTheme(opaline.colors);

    expect(theme.themeMode).toBe('light');
    expect(contrastRatio(theme.bg, theme.text)).toBeGreaterThanOrEqual(4.5);
  });

  it('intensifies a genuinely dark input into a near-black background with light text', () => {
    const theme = deriveTheme(['#111111', '#eeeeee']);

    expect(theme.themeMode).toBe('dark');
    expect(theme.bg.toLowerCase()).toBe('#070707');
    expect(theme.text.toLowerCase()).toBe('#eeeeee');
  });

  it('is deterministic for the same input', () => {
    const palette = PALETTES[0];

    expect(deriveTheme(palette.colors)).toEqual(deriveTheme(palette.colors));
  });
});

describe('applyTheme / applyPaletteByName', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('style');
    delete document.documentElement.dataset.wsThemeMode;
  });

  it('sets each color token as a --ws-* CSS custom property, and themeMode as a data attribute, on the root element', () => {
    const theme = deriveTheme(['#111111', '#eeeeee', '#ff0000']);

    applyTheme(theme);

    expect(document.documentElement.style.getPropertyValue('--ws-bg').trim()).toBe(theme.bg);
    expect(document.documentElement.style.getPropertyValue('--ws-text').trim()).toBe(theme.text);
    expect(document.documentElement.style.getPropertyValue('--ws-primary').trim()).toBe(theme.primary);
    expect(document.documentElement.style.getPropertyValue('--ws-accent-secondary').trim()).toBe(
      theme.accentSecondary
    );
    expect(document.documentElement.dataset.wsThemeMode).toBe(theme.themeMode);
  });

  it('applying a palette by name persists the choice to localStorage', () => {
    const name = PALETTES[2].name;

    applyPaletteByName(name);

    expect(getStoredPaletteName()).toBe(name);
    expect(document.documentElement.style.getPropertyValue('--ws-bg').trim()).not.toBe('');
  });

  it('silently does nothing for an unknown palette name', () => {
    applyPaletteByName('Not A Real Palette');

    expect(document.documentElement.style.getPropertyValue('--ws-bg').trim()).toBe('');
    expect(getStoredPaletteName()).toBeNull();
  });
});
