const HEX_COLOUR = /^#[0-9A-Fa-f]{6}$/;

export const DARK_TEXT = '#000000';
export const LIGHT_TEXT = '#ffffff';

export function isHexColour(value: string | null | undefined): value is string {
  return typeof value === 'string' && HEX_COLOUR.test(value);
}

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a `#rrggbb` colour (WCAG 2.1). */
export function luminance(hex: string): number {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

/** Contrast ratio between two `#rrggbb` colours, from 1 to 21 (WCAG 2.1). */
export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Black or white, whichever reads better on the given background. The better of the two always reaches at
 * least 4.5:1, the WCAG AA ratio for normal text, whatever colour an editor picks in Contentful.
 */
export function readableTextColour(background: string): string {
  return contrastRatio(background, DARK_TEXT) >= contrastRatio(background, LIGHT_TEXT)
    ? DARK_TEXT
    : LIGHT_TEXT;
}
