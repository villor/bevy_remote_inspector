import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function replacer(_key: any, value: any) {
  if (value instanceof Map) {
    const ret: Record<any, any> = {};

    for (const [k, v] of value.entries()) {
      ret[k] = v;
    }
    return ret;
  }
  return value;
}

export function deepStringify(obj: any, otps?: any) {
  return JSON.stringify(obj, replacer, otps);
}

export function snakeToWords(s: string) {
  return s
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}
