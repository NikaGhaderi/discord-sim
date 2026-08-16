/**
 * applyPalette — turns a flat list of palette swatches into the app's
 * `--ws-*` design tokens (already consumed throughout workspaces.css, the
 * bokhar-derived ui/ kit's @theme inline bridge, and, for the chat surfaces
 * specifically, MessageThread/Composer/etc.'s own Tailwind arbitrary-value
 * classes -- every button, modal, sidebar, and message bubble in the app
 * reads these, so setting them on :root re-themes the whole app without
 * touching component code).
 *
 * Role assignment is algorithmic, not hand-picked per palette: each color's
 * luminance and saturation (chroma) decide whether it becomes the
 * background, the text color, or the accent. Two branches exist: a palette
 * whose darkest neutral swatch is genuinely dark gets a "dark shell" (that
 * swatch intensified toward near-black, light text, colorful radial-gradient
 * glow tokens); a palette with nothing dark enough to work with keeps the
 * original light-background/dark-text chrome, but still gets a colorful
 * identity via a tinted shadow token instead of a background glow. A
 * contrast safety net (see contrastRatio checks below) guarantees text
 * stays legible either way.
 */

import { PALETTES } from './palettes';
import { CURATED_THEMES } from './curatedThemes';

interface RGB {
  r: number;
  g: number;
  b: number;
}

/** The 15 hand-tunable tokens every curated palette in curatedThemes.ts
 * still authors directly -- unchanged by this rework. */
export interface BaseThemeTokens {
  bg: string;
  bgNav: string;
  bgSidebar: string;
  bgHover: string;
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

/** The 4 new tokens, always algorithmically derived (never hand-curated),
 * for every palette -- dark-shell palettes use glowPrimary/glowSecondary as
 * background-gradient blobs; light-chrome palettes use shadowTint as a
 * colored box-shadow on cards/panels/dialogs instead. accentSecondary is
 * used by both branches (a second vivid color so buttons/borders/icons
 * aren't all one single accent). */
export interface ExtraTokens {
  accentSecondary: string;
  glowPrimary: string;
  glowSecondary: string;
  shadowTint: string;
  themeMode: 'dark' | 'light';
}

export type ThemeTokens = BaseThemeTokens & ExtraTokens;

const BLACK: RGB = { r: 0, g: 0, b: 0 };
const WHITE: RGB = { r: 255, g: 255, b: 255 };
const DEFAULT_DANGER = '#dc2626';
const STORAGE_KEY = 'discord-sim:palette';
/** Below this rank-luminance (0-255 scale), a swatch reads as a plausible
 * dark-mode surface color on its own -- not merely "the darkest shade in an
 * otherwise-light palette". Above it, forcing a dark shell would just look
 * like a muddy gray, so the palette stays on the light-chrome branch. */
const DARK_ELIGIBLE_LUMINANCE = 90;
/** How hard the chosen dark-branch bg swatch gets pushed toward pure black,
 * so every dark-eligible palette lands at a consistent near-black depth
 * regardless of exactly how dark its source swatch was. */
const DARK_INTENSIFY_RATIO = 0.6;

const CSS_VAR_BY_TOKEN: Record<keyof Omit<ThemeTokens, 'themeMode'>, string> = {
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
  accentSecondary: '--ws-accent-secondary',
  glowPrimary: '--ws-glow-primary',
  glowSecondary: '--ws-glow-secondary',
  shadowTint: '--ws-shadow-tint',
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

function rgbToHsl({ r, g, b }: RGB): [number, number, number] {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rN) h = ((gN - bN) / d) % 6;
  else if (max === gN) h = (bN - rN) / d + 2;
  else h = (rN - gN) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r1, g1, b1] = [0, 0, 0];
  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 };
}

/** Rotates a hex color's hue by the given degrees, keeping saturation/
 * lightness -- used only as a last-resort fallback when a palette has no
 * genuinely unused swatch left to spend on a new role (e.g. Graphite, whose
 * 6 raw swatches are all already spent by its curated theme). */
function hueShift(hex: string, degrees: number): RGB {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return hslToRgb((h + degrees + 360) % 360, s, l);
}

/** Derives the 4 new tokens for a palette, given whichever bg/primary colors
 * are already in play (either deriveTheme's own freshly-computed ones, or a
 * curated theme's hand-picked ones) and the full set of hex values already
 * spent on other roles, so a new role doesn't just duplicate an existing
 * color -- the whole point of "diverse" colorful chrome. */
function deriveExtraTokens(
  paletteColors: string[],
  bgHex: string,
  primaryHex: string,
  excludeHexes: string[]
): ExtraTokens {
  const excluded = new Set(excludeHexes.map((h) => h.toLowerCase()));
  const candidates = paletteColors
    .filter((hex) => !excluded.has(hex.toLowerCase()))
    .map((hex) => ({ hex, c: hexToRgb(hex) }))
    .map((entry) => ({ ...entry, chroma: chroma(entry.c) }))
    .sort((a, b) => b.chroma - a.chroma);

  const themeMode: 'dark' | 'light' =
    rankLuminance(hexToRgb(bgHex)) < DARK_ELIGIBLE_LUMINANCE ? 'dark' : 'light';

  const accentSecondaryRgb = candidates[0] ? candidates[0].c : hueShift(primaryHex, 45);
  const secondRgb = candidates[1] ? candidates[1].c : hueShift(toHex(accentSecondaryRgb), 60);

  return {
    accentSecondary: toHex(accentSecondaryRgb),
    glowPrimary: toHex(accentSecondaryRgb),
    glowSecondary: toHex(secondRgb),
    shadowTint: toHex(secondRgb),
    themeMode,
  };
}

// NOTE: all 19 shipped palettes have a CURATED_THEMES entry, so
// applyPaletteByName never actually calls deriveTheme() for any of them in
// production -- this function (and its dark/light branch logic below) only
// runs for a hypothetical future palette added without a curated entry, and
// in tests. Don't be surprised that tweaking it has no visible effect on any
// of the current 19 palettes.
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
  const darkestMeta = sortedByLum[0];
  const lightestMeta = sortedByLum[sortedByLum.length - 1];

  const isDark = darkestMeta.lum < DARK_ELIGIBLE_LUMINANCE;
  const textMeta = isDark ? lightestMeta : darkestMeta;
  const bgMeta = isDark ? darkestMeta : lightestMeta;

  let text = textMeta.c;
  let bg = isDark ? mix(bgMeta.c, BLACK, DARK_INTENSIFY_RATIO) : bgMeta.c;
  if (contrastRatio(bg, text) < 4.5) {
    text = isDark ? mix(text, WHITE, 0.6) : mix(text, BLACK, 0.6);
  }
  if (contrastRatio(bg, text) < 4.5) {
    bg = isDark ? mix(bg, BLACK, 0.6) : mix(bg, WHITE, 0.6);
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
  // chrome stays a coherent panel rather than jumping to an unrelated hue,
  // while still being a real distinct palette color instead of bg blended
  // with text.
  const bgSidebarMeta = take(remaining, (c) =>
    [...c].sort((a, b) => Math.abs(a.lum - bgMeta.lum) - Math.abs(b.lum - bgMeta.lum))[0]
  );
  let bgSidebar = bgSidebarMeta ? mix(bgSidebarMeta.c, bg, 0.35) : mix(bg, text, 0.06);
  while (contrastRatio(bgSidebar, text) < 4.5) {
    bgSidebar = mix(bgSidebar, bg, 0.5);
  }

  // The top nav bar reads as its own distinct strip, not a continuation of
  // the left sidebar -- carries a hint of the accent color so it doesn't
  // just look like a copy of bgSidebar. Nudged back toward bg if that tint
  // ever made text on it hard to read.
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

  // The message thread's own backdrop. In the light branch this reuses the
  // palette's dark "text" tone (unchanged from before -- the piece that
  // makes the chat area itself change per palette). In the dark branch bg
  // is already dark, so the chat backdrop is just a slightly deeper step
  // off of it instead of jumping to an unrelated tone.
  let bgChat: RGB;
  const textOnChat = WHITE;
  if (isDark) {
    bgChat = mix(bg, BLACK, 0.15);
  } else {
    bgChat = text;
    if (contrastRatio(bgChat, WHITE) < 4.5) {
      bgChat = mix(bgChat, BLACK, 0.5);
    }
  }

  // Message bubbles sit lighter than the chat backdrop they're on, so they
  // read as raised cards rather than blending into it.
  let bgBubble = mix(bgChat, WHITE, 0.22);
  let textOnBubble = WHITE;
  if (contrastRatio(bgBubble, textOnBubble) < 4.5) {
    textOnBubble = text;
    if (contrastRatio(bgBubble, textOnBubble) < 4.5) {
      bgBubble = mix(bgBubble, WHITE, 0.4);
    }
  }
  const textSecondaryOnBubble = mix(textOnBubble, bgBubble, 0.45);

  const base: BaseThemeTokens = {
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

  const usedHexes = [...used].map((m) => toHex(m.c));

  const extra = deriveExtraTokens(colors, base.bg, base.primary, usedHexes);

  return { ...base, ...extra };
}

export function applyTheme(tokens: ThemeTokens): void {
  const root = document.documentElement;
  (Object.keys(CSS_VAR_BY_TOKEN) as (keyof Omit<ThemeTokens, 'themeMode'>)[]).forEach((key) => {
    root.style.setProperty(CSS_VAR_BY_TOKEN[key], tokens[key]);
  });
  root.dataset.wsThemeMode = tokens.themeMode;
}

export function applyPaletteByName(name: string): void {
  const palette = PALETTES.find((p) => p.name === name);
  if (!palette) return;
  const curated = CURATED_THEMES[name];
  const tokens: ThemeTokens = curated
    ? { ...curated, ...deriveExtraTokens(palette.colors, curated.bg, curated.primary, Object.values(curated)) }
    : deriveTheme(palette.colors);
  applyTheme(tokens);
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
