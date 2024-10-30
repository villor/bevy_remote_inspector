import { type AnyColor, type ColorSpace, convertThrough } from './ColorInput';
import type { Rgba } from './linearRgba';

export function fromSrgba(srgba: Rgba, to: ColorSpace): AnyColor {
  if (to === 'Srgba') {
    return srgba;
  }
  if (to === 'LinearRgba') {
    return {
      red: gammaFunction(srgba.red),
      green: gammaFunction(srgba.green),
      blue: gammaFunction(srgba.blue),
      alpha: srgba.alpha,
    };
  }
  return convertThrough(srgba, 'Srgba', 'LinearRgba', to);
}

export function toSrgba(color: AnyColor, from: ColorSpace): Rgba {
  if (from === 'Srgba') {
    return color as Rgba;
  }

  if (from === 'LinearRgba') {
    const { red, green, blue, alpha } = color as Rgba;
    return {
      red: gammaFunctionInverse(red),
      green: gammaFunctionInverse(green),
      blue: gammaFunctionInverse(blue),
      alpha,
    };
  }

  return convertThrough(color, from, 'LinearRgba', 'Srgba');
}

function gammaFunctionInverse(value: number): number {
  if (value <= 0.0) {
    return value;
  }

  if (value <= 0.0031308) {
    return value * 12.92; // linear falloff in dark values
  }
  return 1.055 * value ** (1.0 / 2.4) - 0.055; // gamma curve in other area
}
function gammaFunction(value: number): number {
  if (value <= 0.0) {
    return value;
  }
  if (value <= 0.04045) {
    return value / 12.92; // linear falloff in dark values
  }
  return ((value + 0.055) / 1.055) ** 2.4; // gamma curve in other area
}
