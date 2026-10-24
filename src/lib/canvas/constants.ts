// Hatch/fill alpha, applied in both themes. 0.2 = 80% transparent (20% opaque).
export const DARK_FILL_ALPHA = 0.2;

export const MEDIUM_DARK_YELLOW = '#d97706';
export const DEFAULT_TEXT_COLOR = MEDIUM_DARK_YELLOW;

export const DEFAULT_WIDTH = 160;
export const DEFAULT_HEIGHT = 80;
export const DEFAULT_STROKE_WIDTH = 1.5;
export const DEFAULT_FONT_SIZE = 15;
export const CANVAS_FONT_STACK = `"Lora", "Georgia", serif`;

export const NAMED_COLORS: Record<string, [number, number, number]> = {
  white: [255, 255, 255],
  black: [0, 0, 0],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
};

export const EDITORIAL_PALETTES = {
  risograph: {
    terracotta: 'rgba(224, 109, 83, 0.22)',
    cobalt: 'rgba(59, 102, 207, 0.22)',
    sage: 'rgba(78, 154, 126, 0.22)',
    sunflower: 'rgba(229, 169, 59, 0.22)',
    plum: 'rgba(124, 74, 115, 0.22)',
  },
  editorial: {
    olive: 'rgba(85, 107, 47, 0.22)',
    ochre: 'rgba(204, 119, 34, 0.22)',
    slate: 'rgba(47, 53, 66, 0.22)',
    rose: 'rgba(214, 109, 117, 0.22)',
  },
  botanical: {
    fern: 'rgba(74, 124, 89, 0.22)',
    moss: 'rgba(141, 153, 111, 0.22)',
    eucalyptus: 'rgba(92, 131, 116, 0.22)',
    bark: 'rgba(125, 90, 80, 0.22)',
  },
  cyberpunk: {
    cyan: 'rgba(6, 182, 212, 0.24)',
    lavender: 'rgba(168, 85, 247, 0.24)',
    amber: 'rgba(245, 158, 11, 0.24)',
    carbon: 'rgba(30, 41, 59, 0.28)',
  },
};
