import { type AnyColor, type ColorSpace, convertThrough } from './ColorInput';
import type { LabaOrOklaba } from './laba';

export type LchaOrOklcha = {
  lightness: number;
  chroma: number;
  hue: number;
  alpha: number;
};

export function fromLcha(lcha: LchaOrOklcha, to: ColorSpace): AnyColor {
  if (to === 'Lcha') {
    return lcha;
  }

  if (to === 'Laba') {
    const { lightness, chroma, hue, alpha } = lcha;
    const radians = (hue * Math.PI) / 180;
    const a = chroma * Math.cos(radians);
    const b = chroma * Math.sin(radians);

    return { lightness, a, b, alpha };
  }

  return convertThrough(lcha, 'Lcha', 'Laba', to);
}

export function toLcha(color: AnyColor, from: ColorSpace): LchaOrOklcha {
  if (from === 'Lcha') {
    return color as LchaOrOklcha;
  }

  if (from === 'Laba') {
    const { lightness, a, b, alpha } = color as LabaOrOklaba;
    const chroma = Math.hypot(a, b);
    let hue = Math.atan2(b, a) * (180 / Math.PI);

    if (hue < 0) {
      hue += 360;
    }

    return { lightness, chroma, hue, alpha };
  }

  return convertThrough(color, from, 'Laba', 'Lcha');
}
