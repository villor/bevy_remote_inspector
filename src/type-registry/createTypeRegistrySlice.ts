import { TypeRegistryEvent } from '@/websocket/useWs';
import { StateCreator } from 'zustand';
import { TType, TypeName } from './useTypeRegistry';

export type TypeRegistrySlice = {
  registry: Map<TypeName, TType>;
  setRegistry: (types: TypeRegistryEvent['types']) => void;
};
export const createTypeRegistrySlice: StateCreator<TypeRegistrySlice> = (
  set
) => ({
  registry: new Map(),
  setRegistry: (types: TypeRegistryEvent['types']) =>
    set({ registry: new Map(types) }),
});
