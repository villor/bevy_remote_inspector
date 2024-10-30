import { type AnyColor, type ColorSpace, convertThrough } from './ColorInput';
import type { Xyza } from './xyza';

export type LabaOrOklaba = {
  lightness: number;
  a: number;
  b: number;
  alpha: number;
};

export function fromLaba(color: LabaOrOklaba, to: ColorSpace): AnyColor {
  if (to === 'Laba') {
    return color;
  }

  if (to === 'Xyza') {
    const l = 100 * color.lightness;
    const a = 100 * color.a;
    const b = 100 * color.b;

    const fy = (l + 16.0) / 116.0;
    const fx = a / 500.0 + fy;
    const fz = fy - b / 200.0;

    const xr = Math.pow(fx, 3.0) > 0.008856 ? Math.pow(fx, 3.0) : (116.0 * fx - 16.0) / 903.3;
    const yr = l > 0.008856 * 903.3 ? Math.pow((l + 16.0) / 116.0, 3.0) : l / 903.3;
    const zr = Math.pow(fz, 3.0) > 0.008856 ? Math.pow(fz, 3.0) : (116.0 * fz - 16.0) / 903.3;

    const x = xr * 0.95047;
    const y = yr * 1.0;
    const z = zr * 1.08883;

    return { x, y, z, alpha: color.alpha };
  }

  return convertThrough(color, 'Laba', 'Xyza', to);
}

export function toLaba(color: AnyColor, from: ColorSpace): LabaOrOklaba {
  if (from === 'Laba') {
    return color as LabaOrOklaba;
  }

  if (from === 'Xyza') {
    const { x, y, z } = color as Xyza;
    const xr = x / 0.95047;
    const yr = y / 1.0;
    const zr = z / 1.08883;

    const fx = xr > 0.008856 ? Math.cbrt(xr) : (903.3 * xr + 16.0) / 116.0;
    const fy = yr > 0.008856 ? Math.cbrt(yr) : (903.3 * yr + 16.0) / 116.0;
    const fz = zr > 0.008856 ? Math.cbrt(zr) : (903.3 * zr + 16.0) / 116.0;

    const lightness = 1.16 * fy - 0.16;
    const a = 5.0 * (fx - fy);
    const b = 2.0 * (fy - fz);

    return { lightness, a, b, alpha: color.alpha };
  }

  return convertThrough(color, from, 'Xyza', 'Laba');
}
