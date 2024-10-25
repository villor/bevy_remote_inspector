import { AnyColor, ColorSpace, convertThrough } from './ColorInput';
import { LabaOrOklaba } from './laba';
import { LchaOrOklcha } from './lcha';

export function fromOkLcha(oklcha: LchaOrOklcha, to: ColorSpace): AnyColor {
  if (to === 'Oklcha') {
    return oklcha;
  }

  if (to === 'Oklaba') {
    const { lightness, chroma, hue, alpha } = oklcha;
    const radians = (hue * Math.PI) / 180;
    const a = chroma * Math.cos(radians);
    const b = chroma * Math.sin(radians);

    return {
      lightness,
      a,
      b,
      alpha,
    };
  }

  return convertThrough(oklcha, 'Oklcha', 'Oklaba', to);
}

export function toOkLcha(color: AnyColor, from: ColorSpace): LchaOrOklcha {
  if (from === 'Oklcha') {
    return color as LchaOrOklcha;
  }

  if (from === 'Oklaba') {
    const { lightness, a, b, alpha } = color as LabaOrOklaba;
    const chroma = Math.hypot(a, b);
    let hue = Math.atan2(b, a) * (180 / Math.PI);

    if (hue < 0) {
      hue += 360;
    }

    return { lightness, chroma, hue, alpha };
  }

  return convertThrough(color, from, 'Oklaba', 'Oklcha');
}
