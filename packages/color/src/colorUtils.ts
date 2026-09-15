import { HexColor } from './model/HexColor.js';

/**
 * Blend the given hexadecimal colors.
 * @param hexColors The colors to blend.
 * @returns The blended color in hexadecimal format.
 */
export const blendColors = (hexColors: string[]): string => {
  if (hexColors.length === 0) {
    throw new Error('Cannot blend colors from an empty list');
  } else if (hexColors.length === 1) {
    return hexColors[0];
  } else {
    const parsedColors = hexColors.map(hex =>
      HexColor.fromHexadecimalString(hex)
    );
    const sum = parsedColors.reduce((rgb1, rgb2) => rgb1.add(rgb2));
    const blendedR = sum.red / hexColors.length;
    const blendedG = sum.green / hexColors.length;
    const blendedB = sum.blue / hexColors.length;
    const blendedRgb = new HexColor(blendedR, blendedG, blendedB);
    return blendedRgb.hexValue;
  }
};

/**
 * Lighten a given hexadecimal color.
 * @param hexColor The color to lighten.
 * @returns A lighten version of the color.
 */
export const lightenColor = (hexColor: string): string => {
  const parsedColor = HexColor.fromHexadecimalString(hexColor);
  const lighterColor = parsedColor.toLighter();
  return lighterColor.hexValue;
};

/**
 * Darken a given hexadecimal color.
 * @param hexColor The color to darken.
 * @returns A darken version of the color.
 */
export const darkenColor = (hexColor: string): string => {
  const parsedColor = HexColor.fromHexadecimalString(hexColor);
  const darkerColor = parsedColor.toDarker();
  return darkerColor.hexValue;
};

export const identifyColor = (hexColor: string): HexColor => {
  return HexColor.fromHexadecimalString(hexColor);
};

/**
 * Get a random HEX color.
 * @returns A random color.
 */
export const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};
