import { type AnyColor, type ColorSpace, convertThrough } from './ColorInput';
import type { LabaOrOklaba } from './laba';
import type { Rgba } from './linearRgba';

export function fromOklaba(oklaba: LabaOrOklaba, to: ColorSpace): AnyColor {
  if (to === 'Oklaba') {
    return oklaba;
  }

  if (to === 'LinearRgba') {
    const { lightness, a, b, alpha } = oklaba;

    const l_ = lightness + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = lightness - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = lightness - 0.0894841775 * a - 1.291485548 * b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    const red = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const green = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const blue = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

    return { red, green, blue, alpha };
  }

  return convertThrough(oklaba, 'Oklaba', 'LinearRgba', to);
}

export function toOklaba(color: AnyColor, from: ColorSpace): LabaOrOklaba {
  if (from === 'Oklaba') {
    return color as LabaOrOklaba;
  }

  if (from === 'LinearRgba') {
    const { red, green, blue, alpha } = color as Rgba;

    const l = 0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue;
    const m = 0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue;
    const s = 0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue;

    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);

    const lightness = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
    const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
    const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

    return { lightness, a, b, alpha };
  }

  return convertThrough(color, from, 'LinearRgba', 'Oklaba');
}
