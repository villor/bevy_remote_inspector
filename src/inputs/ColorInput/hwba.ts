import { type AnyColor, type ColorSpace, convertThrough } from './ColorInput';
import type { Rgba } from './linearRgba';
export type Hwba = {
  hue: number;
  whiteness: number;
  blackness: number;
  alpha: number;
};

export function fromHwba(hwba: Hwba, to: ColorSpace): AnyColor {
  if (to === 'Hwba') {
    return hwba;
  }

  if (to === 'Srgba') {
    const { hue, whiteness, blackness, alpha } = hwba;
    const w = whiteness;
    const v = 1 - blackness;

    const h = (hue % 360) / 60;
    const i = Math.floor(h);
    const f = h - i;

    const adjustedF = i % 2 === 0 ? f : 1 - f;

    const n = w + adjustedF * (v - w);

    let red: number;
    let green: number;
    let blue: number;
    switch (i) {
      case 0:
        red = v;
        green = n;
        blue = w;
        break;
      case 1:
        red = n;
        green = v;
        blue = w;
        break;
      case 2:
        red = w;
        green = v;
        blue = n;
        break;
      case 3:
        red = w;
        green = n;
        blue = v;
        break;
      case 4:
        red = n;
        green = w;
        blue = v;
        break;
      case 5:
        red = v;
        green = w;
        blue = n;
        break;
      default:
        throw new Error(`i is bounded in [0, 6) but got ${i}`);
    }

    return { red, green, blue, alpha };
  }

  return convertThrough(hwba, 'Hwba', 'Srgba', to);
}
export function toHwba(color: AnyColor, from: ColorSpace): Hwba {
  if (from === 'Hwba') {
    return color as Hwba;
  }

  if (from === 'Srgba') {
    const { red, green, blue, alpha } = color as Rgba;

    const xMax = Math.max(red, green, blue);
    const xMin = Math.min(red, green, blue);

    const chroma = xMax - xMin;

    let hue: number;
    if (chroma === 0) {
      hue = 0;
    } else if (red === xMax) {
      hue = 60 * ((green - blue) / chroma);
    } else if (green === xMax) {
      hue = 60 * (2 + (blue - red) / chroma);
    } else {
      hue = 60 * (4 + (red - green) / chroma);
    }

    if (hue < 0) {
      hue += 360;
    }

    const whiteness = xMin;
    const blackness = 1 - xMax;

    return { hue, whiteness, blackness, alpha };
  }

  return convertThrough(color, from, 'Srgba', 'Hwba');
}
