import { AnyColor, ColorSpace, convertThrough } from './ColorInput';
import { Hsva } from './hsva';

export type Hsla = {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
};

export function fromHsla(hsla: Hsla, to: ColorSpace): AnyColor {
  if (to === 'Hsla') {
    return hsla;
  }
  if (to === 'Hsva') {
    // Based on https://en.wikipedia.org/wiki/HSL_and_HSV#HSL_to_HSV
    const { hue, saturation, lightness, alpha } = hsla;
    const value = lightness + saturation * Math.min(lightness, 1 - lightness);
    const newSaturation = value === 0 ? 0 : 2 * (1 - lightness / value);

    return { hue, saturation: newSaturation, value, alpha };
  }
  return convertThrough(hsla, 'Hsla', 'Hsva', to);
}

export function toHsla(color: AnyColor, from: ColorSpace): Hsla {
  if (from === 'Hsla') {
    return color as Hsla;
  }

  if (from === 'Hsva') {
    const { hue, saturation, value, alpha } = color as Hsva;
    const lightness = value * (1 - saturation / 2);
    const newSaturation =
      lightness === 0 || lightness === 1
        ? 0
        : (value - lightness) / Math.min(lightness, 1 - lightness);

    return { hue, saturation: newSaturation, lightness, alpha };
  }

  return convertThrough(color, from, 'Hsva', 'Hsla');
}
