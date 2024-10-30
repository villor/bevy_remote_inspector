import { type AnyColor, type ColorSpace, convertThrough } from './ColorInput';
import type { Hwba } from './hwba';

export type Hsva = {
  hue: number;
  saturation: number;
  value: number;
  alpha: number;
};

export function fromHsva(hsva: Hsva, to: ColorSpace): AnyColor {
  if (to === 'Hsva') {
    return hsva;
  }
  if (to === 'Hwba') {
    const whiteness = (1 - hsva.saturation) * hsva.value;
    const blackness = 1 - hsva.value;
    console.log('whiteness', whiteness);
    console.log('blackness', blackness);
    return {
      hue: hsva.hue,
      whiteness: whiteness,
      blackness: blackness,
      alpha: hsva.alpha,
    };
  }

  return convertThrough(hsva, 'Hsva', 'Hwba', to);
}

export function toHsva(color: AnyColor, from: ColorSpace): Hsva {
  if (from === 'Hsva') {
    return color as Hsva;
  }

  if (from === 'Hwba') {
    const { hue, whiteness, blackness, alpha } = color as Hwba;
    const value = 1 - blackness;
    const saturation = value !== 0 ? 1 - whiteness / value : 0;

    return {
      hue,
      saturation,
      value,
      alpha,
    };
  }

  return convertThrough(color, from, 'Hwba', 'Hsva');
}
