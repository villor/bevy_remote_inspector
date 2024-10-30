import type { TEnum, TValueObject } from '@/type-registry/useTypeRegistry';
import { useDynamicForm } from '../DynamicForm';
import { Fragment, useMemo, useState } from 'react';
import { NativeSelect } from '../../shared/ui/native-select';
import {
  Button,
  ColorPicker as AriaColorPicker,
  Dialog,
  DialogTrigger,
  Popover,
  type ColorPickerProps,
  ColorSwatch,
  ColorArea,
  parseColor,
  ColorThumb as AriaColorThumb,
  ColorSlider as AriaColorSlider,
  SliderTrack,
  type ColorSliderProps,
  type ColorThumbProps,
} from 'react-aria-components';
import { cn } from '@/utils';
import { fromHsla, type Hsla, toHsla } from './hsla';
import { fromHsva, type Hsva, toHsva } from './hsva';
import { fromHwba, type Hwba, toHwba } from './hwba';
import { fromLaba, type LabaOrOklaba, toLaba } from './laba';
import { fromLcha, type LchaOrOklcha, toLcha } from './lcha';
import type { Rgba } from './linearRgba';
import { fromOklaba, toOklaba } from './oklaba';
import { fromOkLcha, toOkLcha } from './oklcha';
import { fromXyza, toXyza, type Xyza } from './xyza';
import { fromSrgba, toSrgba } from './srgba';
import { useWatch } from 'react-hook-form';

export type ColorInputProps = {
  typeInfo: TEnum;
  path: string;
};

export type ColorSpace =
  | 'Srgba'
  | 'LinearRgba'
  | 'Hsla'
  | 'Hsva'
  | 'Hwba'
  | 'Laba'
  | 'Lcha'
  | 'Oklaba'
  | 'Oklcha'
  | 'Xyza';

export function ColorInput({ typeInfo, path }: ColorInputProps) {
  const { unregister, setValue, control } = useDynamicForm();
  const value = useWatch({ control, name: path }) as TValueObject;
  const currentColor = Object.values(value)[0] as AnyColor;
  const [selectedColorSpace, setSelectedColorSpace] = useState<ColorSpace>(() => {
    return typeInfo.variants.find((v) => {
      return v.name === Object.keys(value)[0];
    })!.name as ColorSpace;
  });

  const { red, green, blue, alpha } = convertColor(
    currentColor,
    selectedColorSpace,
    'Srgba',
  ) as Rgba;

  const ariaColor = useMemo(() => {
    return parseColor(`rgba(${red * 255}, ${green * 255}, ${blue * 255}, ${alpha})`);
  }, [red, green, blue, alpha]);

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex gap-x-4">
        <NativeSelect
          className="w-24"
          value={selectedColorSpace}
          onChange={(e) => {
            const newColorSpace = e.target.value as ColorSpace;
            const newPath = `${path}.${newColorSpace}`;
            unregister(path);
            const newColor = convertColor(currentColor, selectedColorSpace, newColorSpace);
            setValue(newPath, newColor);
            setSelectedColorSpace(newColorSpace);
          }}
        >
          {typeInfo.variants.map((variant) => (
            <option key={variant.name} value={variant.name}>
              {variant.name}
            </option>
          ))}
        </NativeSelect>
        <div className="w-full h-9 flex items-center">
          <ColorPicker
            value={ariaColor}
            onChange={(c) => {
              const rgba = c.toFormat('rgba') as unknown as Rgba;
              const newPath = `${path}.${selectedColorSpace}`;
              const newColor = convertColor(
                {
                  red: rgba.red / 255,
                  green: rgba.green / 255,
                  blue: rgba.blue / 255,
                  alpha: rgba.alpha,
                },
                'Srgba',
                selectedColorSpace,
              );
              setValue(newPath, newColor);
            }}
          >
            <div className="grid grid-cols-4 gap-x-2 capitalize text-muted-foreground text-sm">
              {Object.keys(currentColor).map((k) => {
                return (
                  <Fragment key={k}>
                    <span>{k}</span>
                  </Fragment>
                );
              })}
            </div>
            <div className="grid grid-cols-4 text-sm gap-x-2">
              {Object.values(currentColor).map((v, i) => {
                return (
                  <Fragment key={i}>
                    <span>{v.toFixed(3)}</span>
                  </Fragment>
                );
              })}
            </div>
          </ColorPicker>
        </div>
      </div>
      {/* <p className={'text-[0.8rem] text-muted-foreground'}>
        Color are rendered as HSB but store as corresponding color space
      </p> */}
    </div>
  );
}

function ColorPicker({ children, ...props }: ColorPickerProps) {
  return (
    <AriaColorPicker {...props}>
      <DialogTrigger>
        <Button>
          <ColorSwatch className="size-8 rounded-md" />
        </Button>
        <Popover placement="bottom start">
          <Dialog className="flex flex-col gap-2 bg-card/90 rounded-lg p-6 shadow">
            <>
              <ColorArea
                className="w-full min-w-56 h-56 rounded-lg bg-gray-300 dark:bg-zinc-800"
                colorSpace="hsb"
                xChannel="saturation"
                yChannel="brightness"
              >
                <ColorThumb />
              </ColorArea>
              <ColorSlider colorSpace="hsb" channel="hue" />
              <ColorSlider channel="alpha" />
              {children}
            </>
          </Dialog>
        </Popover>
      </DialogTrigger>
    </AriaColorPicker>
  );
}

function ColorSlider(props: ColorSliderProps) {
  return (
    <AriaColorSlider
      {...props}
      className={cn('w-full h-6 rounded', props.className)}
      style={{
        background:
          props.channel === 'alpha'
            ? 'repeating-conic-gradient(#CCC 0% 25%, white 0% 50%) 50% / 16px 16px'
            : undefined,
      }}
    >
      <SliderTrack className="group col-span-2 h-6 rounded">
        <ColorThumb></ColorThumb>
      </SliderTrack>
    </AriaColorSlider>
  );
}

function ColorThumb(props: ColorThumbProps) {
  return (
    <AriaColorThumb
      {...props}
      className={cn(
        'w-6 h-6 top-[50%] left-[50%] rounded-full border-2 border-white',
        props.className,
      )}
    />
  );
}

export type AnyColor = Rgba | Hsla | Hsva | Hwba | LabaOrOklaba | LchaOrOklcha | Xyza;

function convertColor(color: AnyColor, from: ColorSpace, to: ColorSpace): AnyColor {
  if (from === to) {
    return color;
  }

  if (from === 'Hsla' && match(to, 'Hsva', 'Hwba', 'Srgba', 'LinearRgba', 'Lcha', 'Xyza')) {
    return fromHsla(color as Hsla, to);
  }

  if (to === 'Hsla' && match(from, 'Hsva', 'Hwba', 'Srgba', 'LinearRgba', 'Lcha', 'Xyza')) {
    return toHsla(color, from);
  }

  if (from === 'Hsva' && match(to, 'Hwba', 'Srgba', 'LinearRgba', 'Lcha', 'Xyza')) {
    return fromHsva(color as Hsva, to);
  }

  if (to === 'Hsva' && match(from, 'Hwba', 'Srgba', 'LinearRgba', 'Lcha', 'Hsva', 'Xyza')) {
    return toHsva(color, from);
  }

  if (from === 'Hwba' && match(to, 'Srgba', 'LinearRgba', 'Lcha', 'Xyza')) {
    return fromHwba(color as Hwba, to);
  }

  if (to === 'Hwba' && match(from, 'Srgba', 'LinearRgba', 'Lcha', 'Xyza')) {
    return toHwba(color, from);
  }

  if (
    from === 'Laba' &&
    match(to, 'Xyza', 'Srgba', 'LinearRgba', 'Hsla', 'Hsva', 'Hwba', 'Oklaba')
  ) {
    return fromLaba(color as LabaOrOklaba, to);
  }

  if (
    to === 'Laba' &&
    match(from, 'Xyza', 'Srgba', 'LinearRgba', 'Hsla', 'Hsva', 'Hwba', 'Oklaba')
  ) {
    return toLaba(color, from);
  }

  if (from === 'Lcha' && match(to, 'Laba', 'Srgba', 'LinearRgba', 'Xyza')) {
    return fromLcha(color as LchaOrOklcha, to);
  }

  if (to === 'Lcha' && match(from, 'Laba', 'Srgba', 'LinearRgba', 'Xyza')) {
    return toLcha(color, from);
  }

  if (
    from === 'Oklaba' &&
    match(to, 'LinearRgba', 'Hsla', 'Hsva', 'Hwba', 'Lcha', 'Srgba', 'Xyza')
  ) {
    return fromOklaba(color as LabaOrOklaba, to);
  }

  if (
    to === 'Oklaba' &&
    match(from, 'LinearRgba', 'Hsla', 'Hsva', 'Hwba', 'Lcha', 'Srgba', 'Xyza')
  ) {
    return toOklaba(color, from);
  }

  if (
    from === 'Oklcha' &&
    match(to, 'Oklaba', 'Hsla', 'Hsva', 'Hwba', 'Laba', 'Lcha', 'LinearRgba', 'Srgba', 'Xyza')
  ) {
    return fromOkLcha(color as LchaOrOklcha, to);
  }

  if (
    to === 'Oklcha' &&
    match(from, 'Oklaba', 'Hsla', 'Hsva', 'Hwba', 'Laba', 'Lcha', 'LinearRgba', 'Srgba', 'Xyza')
  ) {
    return toOkLcha(color, from);
  }

  if (from === 'Srgba' && match(to, 'LinearRgba', 'Xyza')) {
    return fromSrgba(color as Rgba, to);
  }

  if (to === 'Srgba' && match(from, 'LinearRgba', 'Xyza')) {
    return toSrgba(color, from);
  }

  if (from === 'Xyza' && match(to, 'LinearRgba')) {
    return fromXyza(color as Xyza, to);
  }

  if (to === 'Xyza' && match(from, 'LinearRgba')) {
    return toXyza(color, from);
  }

  throw new Error(`Conversion from ${from} to ${to} is not implemented`);
}

function match(source: ColorSpace, ...targets: ColorSpace[]) {
  return targets.includes(source);
}

export function convertThrough<T extends AnyColor = AnyColor>(
  color: AnyColor,
  from: ColorSpace,
  through: ColorSpace,
  to: ColorSpace,
) {
  console.log(`converting from ${from} through ${through} to ${to}`);
  const intermediate = convertColor(color, from, through);
  console.log(`intermediate`, intermediate);
  return convertColor(intermediate, through, to) as T;
}
