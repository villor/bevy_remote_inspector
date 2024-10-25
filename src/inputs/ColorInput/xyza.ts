import { AnyColor, ColorSpace, convertThrough } from './ColorInput';
import { Rgba } from './linearRgba';

export type Xyza = { x: number; y: number; z: number; alpha: number };

export function fromXyza(xyza: Xyza, to: ColorSpace): AnyColor {
  if (to === 'Xyza') {
    return xyza;
  }

  if (to === 'LinearRgba') {
    const red = xyza.x * 3.2404542 + xyza.y * -1.5371385 + xyza.z * -0.4985314;
    const green = xyza.x * -0.969266 + xyza.y * 1.8760108 + xyza.z * 0.041556;
    const blue = xyza.x * 0.0556434 + xyza.y * -0.2040259 + xyza.z * 1.0572252;

    return { red, green, blue, alpha: xyza.alpha };
  }

  throw new Error(`Conversion from Xyza to ${to} is not implemented`);
}

export function toXyza(color: AnyColor, from: ColorSpace): Xyza {
  if (from === 'Xyza') {
    return color as Xyza;
  }

  if (from === 'LinearRgba') {
    const { red, green, blue } = color as Rgba;

    const x = red * 0.4124564 + green * 0.3575761 + blue * 0.1804375;
    const y = red * 0.2126729 + green * 0.7151522 + blue * 0.072175;
    const z = red * 0.0193339 + green * 0.119192 + blue * 0.9503041;

    return { x, y, z, alpha: color.alpha };
  }

  throw new Error(`Conversion from ${from} to Xyza is not implemented`);
}
