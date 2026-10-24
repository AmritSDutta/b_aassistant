import { NAMED_COLORS, EDITORIAL_PALETTES, MEDIUM_DARK_YELLOW } from './constants';

export function normalizeRgba(color: string, alpha: number): string {
  const c = color.trim().toLowerCase();
  if (c === 'transparent') return 'rgba(0, 0, 0, 0)';

  const hex6 = c.match(/^#([0-9a-f]{6})$/i);
  if (hex6) {
    const r = parseInt(hex6[1].slice(0, 2), 16);
    const g = parseInt(hex6[1].slice(2, 4), 16);
    const b = parseInt(hex6[1].slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const hex3 = c.match(/^#([0-9a-f]{3})$/i);
  if (hex3) {
    const r = parseInt(hex3[1][0] + hex3[1][0], 16);
    const g = parseInt(hex3[1][1] + hex3[1][1], 16);
    const b = parseInt(hex3[1][2] + hex3[1][2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)$/i);
  if (rgb) {
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  }
  const named = NAMED_COLORS[c];
  if (named) return `rgba(${named[0]}, ${named[1]}, ${named[2]}, ${alpha})`;

  return color;
}

export function applyThemeAlpha(color: string | undefined, theme: 'dark' | 'light'): string | undefined {
  if (!color || color === 'transparent') return color;
  if (theme === 'light') {
    const match = color.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i);
    if (match) {
      const r = match[1];
      const g = match[2];
      const b = match[3];
      const a = parseFloat(match[4]);
      const boosted = Math.min(0.88, Math.max(0.2, a * 1.8));
      return `rgba(${r}, ${g}, ${b}, ${boosted})`;
    }
  }
  return color;
}

export function resolveHarmonizedFill(
  color: string | undefined,
  paletteName?: string,
  theme: 'dark' | 'light' = 'dark'
): string | undefined {
  if (!color || color === 'transparent') return color;
  const raw = color.trim().toLowerCase();

  const archetypeMap: Record<string, string> = {
    client: 'rgba(99, 102, 241, 0.22)',
    gateway: 'rgba(16, 185, 129, 0.20)',
    db: 'rgba(168, 85, 247, 0.22)',
    database: 'rgba(168, 85, 247, 0.22)',
    queue: 'rgba(251, 146, 60, 0.22)',
    cache: 'rgba(251, 146, 60, 0.22)',
    logic: 'rgba(250, 204, 21, 0.20)',
    decision: 'rgba(250, 204, 21, 0.20)',
    terracotta: 'rgba(224, 109, 83, 0.22)',
    cobalt: 'rgba(59, 102, 207, 0.22)',
    sage: 'rgba(78, 154, 126, 0.22)',
    sunflower: 'rgba(229, 169, 59, 0.22)',
    plum: 'rgba(124, 74, 115, 0.22)',
    olive: 'rgba(85, 107, 47, 0.22)',
    ochre: 'rgba(204, 119, 34, 0.22)',
  };

  if (archetypeMap[raw]) {
    return applyThemeAlpha(archetypeMap[raw], theme);
  }

  if (paletteName && (EDITORIAL_PALETTES as any)[paletteName]) {
    const pal = (EDITORIAL_PALETTES as any)[paletteName];
    if (pal[raw]) return applyThemeAlpha(pal[raw], theme);
  }

  if (raw === '#ff0000' || raw === 'red') return applyThemeAlpha('rgba(224, 109, 83, 0.24)', theme);
  if (raw === '#0000ff' || raw === 'blue') return applyThemeAlpha('rgba(59, 102, 207, 0.24)', theme);
  if (raw === '#00ff00' || raw === 'green') return applyThemeAlpha('rgba(78, 154, 126, 0.24)', theme);
  if (raw === '#ffff00' || raw === 'yellow') return applyThemeAlpha('rgba(229, 169, 59, 0.24)', theme);

  return applyThemeAlpha(color, theme);
}

export function parseColorLuminance(color: string): { luminance: number; alpha: number } | null {
  const c = color.trim().toLowerCase();
  if (c === 'transparent') return { luminance: 255, alpha: 0 };
  if (c === 'white' || c === '#fff' || c === '#ffffff') return { luminance: 255, alpha: 1 };
  if (c === 'black' || c === '#000' || c === '#000000') return { luminance: 0, alpha: 1 };

  if (/^#([0-9a-f]{6})$/i.test(c)) {
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return { luminance: 0.299 * r + 0.587 * g + 0.114 * b, alpha: 1 };
  }
  if (/^#([0-9a-f]{3})$/i.test(c)) {
    const r = parseInt(c[1] + c[1], 16);
    const g = parseInt(c[2] + c[2], 16);
    const b = parseInt(c[3] + c[3], 16);
    return { luminance: 0.299 * r + 0.587 * g + 0.114 * b, alpha: 1 };
  }
  const rgbMatch = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
    return { luminance: 0.299 * r + 0.587 * g + 0.114 * b, alpha: a };
  }

  return null;
}

export function isLightColor(color: string): boolean {
  const parsed = parseColorLuminance(color);
  if (!parsed) {
    const c = color.trim().toLowerCase();
    return ['#e5e7eb', '#f1f5f9', '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', 'lightgray', 'lightgrey', 'white'].includes(c);
  }
  return parsed.luminance > 120;
}

export function isDarkColor(color: string): boolean {
  const parsed = parseColorLuminance(color);
  if (!parsed) {
    const c = color.trim().toLowerCase();
    return ['black', '#000', '#000000', '#0f172a', '#1e293b', '#09090b', 'darkgray', 'darkgrey'].includes(c);
  }
  if (parsed.alpha < 0.6) return false;
  return parsed.luminance < 100;
}

export function resolveThemeTextColor(
  color: string | undefined,
  _theme: 'dark' | 'light' = 'dark',
  _isConnectorPill: boolean = false,
  _fillColor?: string
): string {
  // Medium dark yellow (#d97706) provides high-contrast clarity across both light and dark modes
  if (!color) return MEDIUM_DARK_YELLOW;

  // Generic white, off-white, black, or washed-out slate adapt to medium dark yellow
  if (isLightColor(color) || isDarkColor(color)) {
    return MEDIUM_DARK_YELLOW;
  }

  return color;
}

export function resolveThemeStrokeColor(
  color: string | undefined,
  theme: 'dark' | 'light'
): string {
  if (theme === 'light') {
    if (!color) return '#334155';
    if (isLightColor(color)) return '#334155';
    return color;
  } else {
    if (!color) return '#94a3b8';
    if (isDarkColor(color)) return '#94a3b8';
    return color;
  }
}
