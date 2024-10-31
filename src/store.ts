import { create, type StateCreator } from 'zustand';
import { createInspectorSlice, type InspectorSlice } from '@/entity/createInspectorSlice';
import {
  createTypeRegistrySlice,
  type TypeRegistrySlice,
} from './type-registry/createTypeRegistrySlice';
import { createWsSlice, type WsSlice } from './websocket/createWsSlice';
import { createEntitiesSlice, type EntitiesSlice } from './entity/createEntitiesSlice';
import { type ComponentsSlice, createComponentsSlice } from './component/createComponentsSlice';

export type CreateSlice<T> = StateCreator<SharedSlice, [], [], T>;

export type SharedSlice = TypeRegistrySlice &
  WsSlice &
  ComponentsSlice &
  EntitiesSlice &
  InspectorSlice;

export const useStore = create<SharedSlice>()((...a) => ({
  ...createWsSlice(...a),
  ...createTypeRegistrySlice(...a),
  ...createEntitiesSlice(...a),
  ...createComponentsSlice(...a),
  ...createInspectorSlice(...a),
}));
