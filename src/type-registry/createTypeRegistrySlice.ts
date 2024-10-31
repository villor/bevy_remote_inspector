import type { StateCreator } from 'zustand';
import type { TType, TypeName } from './useTypeRegistry';
import type { TypeRegistryEvent } from '@/websocket/createWsSlice';

export type TypeRegistrySlice = {
  registry: Map<TypeName, TType>;
  setRegistry: (types: TypeRegistryEvent['types']) => void;
};
export const createTypeRegistrySlice: StateCreator<TypeRegistrySlice> = (set) => ({
  registry: new Map(),
  setRegistry: (types: TypeRegistryEvent['types']) => set({ registry: new Map(types) }),
});
