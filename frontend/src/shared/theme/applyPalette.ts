/**
 * applyPalette — turns a flat list of palette swatches into the app's nine
 * `--ws-*` design tokens (already consumed throughout workspaces.css: every
 * button, modal, sidebar, and list row in the app reads these, so setting
 * them on :root re-themes the whole chrome without touching component code).
 *
 * Role assignment is algorithmic, not hand-picked per palette: each color's
 * luminance and saturation (chroma) decide whether it becomes the
 * background, the text color, or the accent. This always produces a light
 * background with dark text -- several of the 19 supported palettes are
 * clearly designed as dark/moody themes, and inverting per-palette would
 * require a second full set of hover/contrast rules; keeping every palette
 * in the same light-chrome mode is the tradeoff made here for something
 * that has to work correctly for 19 arbitrary palettes without hand-tuning
 * each one. A contrast safety net (see ensureContrast) guarantees text
 * stays legible even against a palette with no strong dark neutral.
 */

import { PALETTES } from './palettes';

interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ThemeTokens {
  bg: string;
  bgSidebar: string;
  bgHover: string;
  border: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryHover: string;
  danger: string;
}

const BLACK: RGB = { r: 0, g: 0, b: 0 };
const WHITE: RGB = { r: 255, g: 255, b: 255 };
const DEFAULT_DANGER = '#dc2626';
const STORAGE_KEY = 'discord-sim:palette';
const CSS_VAR_BY_TOKEN: Record<keyof ThemeTokens, string> = {
  bg: '--ws-bg',
  bgSidebar: '--ws-bg-sidebar',
  bgHover: '--ws-bg-hover',
  border: '--ws-border',
  text: '--ws-text',
  textSecondary: '--ws-text-secondary',
  primary: '--ws-primary',
  primaryHover: '--ws-primary-hover',
  danger: '--ws-danger',
};

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex({ r, g, b }: RGB): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/** Ranking-only luminance (no gamma correction) -- fine for sorting colors
 * light-to-dark, not for computing an actual contrast ratio. */
function rankLuminance({ r, g, b }: RGB): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function chroma({ r, g, b }: RGB): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function hueDegrees({ r, g, b }: RGB): number {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === rN) h = ((gN - bN) / d) % 6;
  else if (max === gN) h = (bN - rN) / d + 2;
  else h = (rN - gN) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

/** WCAG relative luminance (gamma-corrected) -- for an actual contrast ratio. */
function wcagLuminance({ r, g, b }: RGB): number {
  const toLinear = (c: number) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(a: RGB, b: RGB): number {
  const l1 = wcagLuminance(a) + 0.05;
  const l2 = wcagLuminance(b) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

export function deriveTheme(colors: string[]): ThemeTokens {
  const withMeta = colors.map((hex) => {
    const c = hexToRgb(hex);
    return { c, lum: rankLuminance(c), chroma: chroma(c), hue: hueDegrees(c) };
  });

  // Prefer picking bg/text from low-saturation colors -- a vivid, dark red
  // makes a poor body-text color even though it may be the "darkest" swatch
  // by raw luminance. Falls back to the full set if the palette has fewer
  // than 2 genuinely neutral colors.
  const neutrals = withMeta.filter((m) => m.chroma < 40);
  const pool = neutrals.length >= 2 ? neutrals : withMeta;
  const sortedByLum = [...pool].sort((a, b) => a.lum - b.lum);
  const textMeta = sortedByLum[0];
  const bgMeta = sortedByLum[sortedByLum.length - 1];

  let text = textMeta.c;
  let bg = bgMeta.c;
  if (contrastRatio(bg, text) < 4.5) {
    text = mix(text, BLACK, 0.6);
  }
  if (contrastRatio(bg, text) < 4.5) {
    bg = mix(bg, WHITE, 0.6);
  }

  const vivid = withMeta
    .filter((m) => m.c !== textMeta.c && m.c !== bgMeta.c)
    .sort((a, b) => b.chroma - a.chroma);
  const primary = (vivid[0] ?? withMeta[withMeta.length - 1]).c;

  const dangerCandidate = withMeta.find(
    (m) => m.chroma >= 40 && (m.hue <= 20 || m.hue >= 345)
  );

  return {
    bg: toHex(bg),
    bgSidebar: toHex(mix(bg, text, 0.06)),
    bgHover: toHex(mix(bg, text, 0.12)),
    border: toHex(mix(bg, text, 0.18)),
    text: toHex(text),
    textSecondary: toHex(mix(text, bg, 0.45)),
    primary: toHex(primary),
    primaryHover: toHex(mix(primary, BLACK, 0.18)),
    danger: dangerCandidate ? toHex(dangerCandidate.c) : DEFAULT_DANGER,
  };
}

export function applyTheme(tokens: ThemeTokens): void {
  const root = document.documentElement;
  (Object.keys(tokens) as (keyof ThemeTokens)[]).forEach((key) => {
    root.style.setProperty(CSS_VAR_BY_TOKEN[key], tokens[key]);
  });
}

export function applyPaletteByName(name: string): void {
  const palette = PALETTES.find((p) => p.name === name);
  if (!palette) return;
  applyTheme(deriveTheme(palette.colors));
  window.localStorage.setItem(STORAGE_KEY, name);
}

export function getStoredPaletteName(): string | null {
  return window.localStorage.getItem(STORAGE_KEY);
}

/** Call once on app boot to re-apply whatever palette was last chosen. */
export function applyStoredPaletteIfAny(): void {
  const stored = getStoredPaletteName();
  if (stored) applyPaletteByName(stored);
}
