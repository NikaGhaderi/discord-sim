/**
 * palettes — the fixed set of color palettes the user can pick from.
 *
 * Each palette is just a flat list of hex swatches. Role assignment (which
 * swatch becomes the background vs. the accent vs. the text color) is
 * derived automatically in applyPalette.ts from each color's luminance and
 * saturation, rather than hand-curated per palette -- with 19 palettes and
 * 4-6 colors each, a consistent algorithm is far more tractable than
 * eyeballing ~90 hex codes, and produces a legible result for any palette
 * added later too.
 */

export interface Palette {
  name: string;
  colors: string[];
}

export const PALETTES: Palette[] = [
  { name: 'Graphite', colors: ['#C1C0C2', '#F5E9E7', '#837D68', '#8A9DB1', '#ECC5C6', '#ECCC5C'] },
  { name: 'Amber Walnut Morning', colors: ['#EBEFEE', '#CCB499', '#C8906D', '#BB6C43', '#4A413C'] },
  { name: 'Rose Quartz Evening', colors: ['#64242F', '#B44446', '#FC8F8F', '#DFD9D8'] },
  { name: 'Sapphire Nightfall Whisper', colors: ['#0474C4', '#5379AE', '#2C444C', '#A8C4EC', '#06457F', '#262B40'] },
  { name: 'Lapis Velvet Evening', colors: ['#213885', '#ECDFD2', '#5F3475', '#081849', '#CCCACC', '#893172'] },
  { name: 'Opaline', colors: ['#F4F4F6', '#E7E7E7', '#D2D2D4', '#FF634A'] },
  { name: 'Deep Vintage Mood', colors: ['#244855', '#E64833', '#874F41', '#90AEAD', '#FB9D00'] },
  { name: 'Mechanical and Floaty', colors: ['#141619', '#2C2E3A', '#050A44', '#0A21C0', '#B3B4BD'] },
  { name: 'Cosmic Artistry', colors: ['#212A31', '#2E3944', '#124E66', '#748D92', '#D3D9D4'] },
  { name: 'Vibrant but Calm', colors: ['#E43D12', '#D6536D', '#FFA2B6', '#EFB11D', '#EBE9E1'] },
  { name: 'Texturized and Dynamic', colors: ['#2F4454', '#2E151B', '#DA7B93', '#376E6F', '#1C3334'] },
  { name: 'Vivid and Sharp', colors: ['#D83F87', '#2A1B3D', '#44318D', '#E98074', '#A4B3B6'] },
  { name: 'Intrepid and Fearless', colors: ['#314455', '#644E5B', '#9E5A63', '#C96567', '#97AABD'] },
  { name: 'Emerald Depths', colors: ['#091413', '#285A48', '#408A71', '#B0E4CC'] },
  { name: 'Dusk Clay', colors: ['#0F3040', '#464858', '#A56F63', '#D99B7F'] },
  { name: 'Olive Grove', colors: ['#9CB080', '#618764', '#2B5748', '#273338'] },
  { name: 'Cocoa Noir', colors: ['#000000', '#1F150C', '#412D15', '#E1DCC9'] },
];
