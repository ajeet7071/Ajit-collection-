export interface ThemePreset {
  id: string;
  name: string;
  nameHi: string;
  primaryHex: string; // Maps to the main 900 brand shade
  accentHex: string;  // Maps to 600/700 shade for preview ring/dots
  lightHex: string;   // Maps to 50 shade for preview cards
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'navy',
    name: 'Royal Navy (Default)',
    nameHi: 'रॉयल नेवी ब्लू (डिफ़ॉल्ट)',
    primaryHex: '#1e3a8a',
    accentHex: '#2563eb',
    lightHex: '#eff6ff',
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    nameHi: 'एमराल्ड ग्रीन (हरा)',
    primaryHex: '#065f46',
    accentHex: '#059669',
    lightHex: '#ecfdf5',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    nameHi: 'शाही पर्पल (बैंगनी)',
    primaryHex: '#4c1d95',
    accentHex: '#7c3aed',
    lightHex: '#f5f3ff',
  },
  {
    id: 'crimson',
    name: 'Crimson Maroon',
    nameHi: 'क्रिमसन मरून (गहरा लाल)',
    primaryHex: '#881337',
    accentHex: '#e11d48',
    lightHex: '#fff1f2',
  },
  {
    id: 'teal',
    name: 'Ocean Teal',
    nameHi: 'ओसियन टील (फ़िरोज़ा)',
    primaryHex: '#134e4a',
    accentHex: '#0d9488',
    lightHex: '#f0fdfa',
  },
  {
    id: 'saffron',
    name: 'Saffron Copper',
    nameHi: 'केसरिया कॉपर (भगवा)',
    primaryHex: '#9a3412',
    accentHex: '#ea580c',
    lightHex: '#fff7ed',
  },
  {
    id: 'indigo',
    name: 'Deep Indigo',
    nameHi: 'डीप इंडिगो (नील)',
    primaryHex: '#312e81',
    accentHex: '#4f46e5',
    lightHex: '#eef2ff',
  },
  {
    id: 'slate',
    name: 'Classic Charcoal',
    nameHi: 'चारकोल स्लेट (ग्रे-ब्लैक)',
    primaryHex: '#1e293b',
    accentHex: '#475569',
    lightHex: '#f8fafc',
  },
];

export const DEFAULT_PRIMARY_COLOR = '#1e3a8a';

/**
 * Helper to parse a hex string (#RRGGBB) into RGB [0..255]
 */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [isNaN(r) ? 30 : r, isNaN(g) ? 58 : g, isNaN(b) ? 138 : b];
  }
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [isNaN(r) ? 30 : r, isNaN(g) ? 58 : g, isNaN(b) ? 138 : b];
}

/**
 * Mix two RGB colors by weight (0 = color1, 1 = color2)
 */
function mixRgb(
  c1: [number, number, number],
  c2: [number, number, number],
  weight: number
): string {
  const w = Math.max(0, Math.min(1, weight));
  const r = Math.round(c1[0] * (1 - w) + c2[0] * w);
  const g = Math.round(c1[1] * (1 - w) + c2[1] * w);
  const b = Math.round(c1[2] * (1 - w) + c2[2] * w);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
}

/**
 * Generates a full 50-950 shade scale from a primary color hex (which anchors at 900)
 */
export function generatePaletteFromHex(primaryHex: string): Record<string, string> {
  const base = hexToRgb(primaryHex || DEFAULT_PRIMARY_COLOR);
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [8, 12, 24];

  return {
    '50': mixRgb(base, white, 0.93),
    '100': mixRgb(base, white, 0.85),
    '200': mixRgb(base, white, 0.72),
    '300': mixRgb(base, white, 0.54),
    '400': mixRgb(base, white, 0.36),
    '500': mixRgb(base, white, 0.22),
    '600': mixRgb(base, white, 0.14),
    '700': mixRgb(base, white, 0.08),
    '800': mixRgb(base, white, 0.04),
    '900': mixRgb(base, white, 0),
    '950': mixRgb(base, black, 0.35),
  };
}

/**
 * Applies the selected primary color theme across the entire application
 * by updating Tailwind v4's --color-blue-* and --theme-primary CSS custom properties.
 */
export function applyPrimaryTheme(primaryHex?: string): void {
  if (typeof document === 'undefined') return;
  const targetHex =
    primaryHex && /^#[0-9A-Fa-f]{6}$/.test(primaryHex.trim())
      ? primaryHex.trim()
      : DEFAULT_PRIMARY_COLOR;

  const root = document.documentElement;
  const palette = generatePaletteFromHex(targetHex);

  Object.entries(palette).forEach(([shade, hex]) => {
    root.style.setProperty(`--color-blue-${shade}`, hex);
  });

  // Also harmonize indigo-900 used in top modal/banner gradients
  root.style.setProperty('--color-indigo-900', palette['800']);
  root.style.setProperty('--theme-primary', palette['900']);

  // Update mobile browser status bar theme-color if present
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', palette['900']);
  }
}
