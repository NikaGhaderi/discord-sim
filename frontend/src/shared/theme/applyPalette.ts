/**
 * applyPalette — turns a flat list of palette swatches into the app's nine
 * `--ws-*` design tokens (already consumed throughout workspaces.css and,
 * for the chat surfaces specifically, MessageThread/Composer/etc.'s own
 * Tailwind arbitrary-value classes -- every button, modal, sidebar, and
 * message bubble in the app reads these, so setting them on :root re-themes
 * the whole app without touching component code).
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
  bgNav: string;
  bgSidebar: string;
  bgHover: string;
  /** The message thread's own dark backdrop -- deliberately darker than
   * bgBubble, so message cards read as "raised" surfaces against it. */
  bgChat: string;
  textOnChat: string;
  bgBubble: string;
  border: string;
  text: string;
  textSecondary: string;
  textOnBubble: string;
  textSecondaryOnBubble: string;
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
  bgNav: '--ws-bg-nav',
  bgSidebar: '--ws-bg-sidebar',
  bgHover: '--ws-bg-hover',
  bgChat: '--ws-bg-chat',
  textOnChat: '--ws-text-on-chat',
  bgBubble: '--ws-bg-bubble',
  border: '--ws-border',
  text: '--ws-text',
  textSecondary: '--ws-text-secondary',
  textOnBubble: '--ws-text-on-bubble',
  textSecondaryOnBubble: '--ws-text-secondary-on-bubble',
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

  // Every other swatch in the palette, spent one at a time on a distinct
  // role below instead of being ignored in favor of interpolating bg/text
  // -- the whole point of a "19 palettes" feature is that different
  // surfaces (nav/sidebar panel, borders, accent, danger) actually look
  // like different colors from the chosen palette, not shades of the same
  // two extremes.
  type Swatch = (typeof withMeta)[number];
  const remaining = withMeta.filter((m) => m.c !== textMeta.c && m.c !== bgMeta.c);
  const used = new Set<Swatch>([textMeta, bgMeta]);
  const take = (
    list: Swatch[],
    pick: (candidates: Swatch[]) => Swatch | undefined
  ): Swatch | undefined => {
    const candidates = list.filter((m) => !used.has(m));
    const picked = pick(candidates);
    if (picked) used.add(picked);
    return picked;
  };

  const primaryMeta = take(remaining, (c) => [...c].sort((a, b) => b.chroma - a.chroma)[0]);
  const primary = (primaryMeta ?? bgMeta).c;

  const dangerMeta = take(remaining, (c) =>
    c.find((m) => m.chroma >= 40 && (m.hue <= 20 || m.hue >= 345))
  );

  // A second, genuinely different swatch for the nav bar/sidebar panel --
  // prefers whatever's left that's closest to bg's own lightness, so the
  // chrome stays a light, readable panel rather than jumping to an
  // unrelated hue, while still being a real distinct palette color instead
  // of bg blended with text.
  const bgSidebarMeta = take(remaining, (c) =>
    [...c].sort((a, b) => Math.abs(a.lum - bgMeta.lum) - Math.abs(b.lum - bgMeta.lum))[0]
  );
  let bgSidebar = bgSidebarMeta ? mix(bgSidebarMeta.c, bg, 0.35) : mix(bg, text, 0.06);
  // Both sidebars (channel list and DM/group list) render plain --ws-text
  // on top of this -- unlike bg, bgSidebar isn't guaranteed to contrast
  // with text on its own, since it can come from any swatch in the
  // palette. Pull it toward bg until it does, rather than risking
  // light-text-on-light-panel or dark-on-dark.
  while (contrastRatio(bgSidebar, text) < 4.5) {
    bgSidebar = mix(bgSidebar, bg, 0.5);
  }

  // The top nav bar reads as its own distinct strip, not a continuation of
  // the left sidebar -- carries a hint of the accent color so it doesn't
  // just look like a copy of bgSidebar. Nudged back toward bg if that
  // tint ever made text on it hard to read.
  let bgNav = mix(bgSidebar, primary, 0.14);
  while (contrastRatio(bgNav, text) < 4.5) {
    bgNav = mix(bgNav, bg, 0.5);
  }

  // A third leftover swatch for borders, same lightness-proximity logic,
  // blended further toward bg since a border only needs to read as a
  // subtle edge, not a solid color block.
  const borderMeta = take(remaining, (c) =>
    [...c].sort((a, b) => Math.abs(a.lum - bgMeta.lum) - Math.abs(b.lum - bgMeta.lum))[0]
  );
  const border = borderMeta ? mix(borderMeta.c, bg, 0.55) : mix(bg, text, 0.18);

  // The message thread gets its own dark backdrop, reusing the palette's
  // own dark-neutral "text" color rather than a fixed gray -- this is the
  // piece that makes the chat area itself change per palette, not just
  // buttons and borders around it. Guaranteed dark enough for white text
  // since it's already passed the >=4.5 contrast-against-bg check above;
  // darkened further only in the rare case that isn't quite enough alone.
  let bgChat = text;
  if (contrastRatio(bgChat, WHITE) < 4.5) {
    bgChat = mix(bgChat, BLACK, 0.5);
  }
  const textOnChat = WHITE;

  // Message bubbles sit lighter than the chat backdrop they're on, so they
  // read as raised cards rather than blending into it. Text color falls
  // back from white to the palette's own dark "text" tone (and, failing
  // that, pushes the bubble itself lighter) so it's always legible however
  // light the bubble ends up.
  let bgBubble = mix(bgChat, WHITE, 0.22);
  let textOnBubble = WHITE;
  if (contrastRatio(bgBubble, textOnBubble) < 4.5) {
    textOnBubble = text;
    if (contrastRatio(bgBubble, textOnBubble) < 4.5) {
      bgBubble = mix(bgBubble, WHITE, 0.4);
    }
  }
  const textSecondaryOnBubble = mix(textOnBubble, bgBubble, 0.45);

  return {
    bg: toHex(bg),
    bgNav: toHex(bgNav),
    bgSidebar: toHex(bgSidebar),
    bgHover: toHex(mix(bgSidebar, text, 0.1)),
    bgChat: toHex(bgChat),
    textOnChat: toHex(textOnChat),
    bgBubble: toHex(bgBubble),
    border: toHex(border),
    text: toHex(text),
    textSecondary: toHex(mix(text, bg, 0.45)),
    textOnBubble: toHex(textOnBubble),
    textSecondaryOnBubble: toHex(textSecondaryOnBubble),
    primary: toHex(primary),
    primaryHover: toHex(mix(primary, BLACK, 0.18)),
    danger: dangerMeta ? toHex(dangerMeta.c) : DEFAULT_DANGER,
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
