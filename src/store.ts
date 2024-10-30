import { create, StateCreator } from 'zustand';
import {
  createInspectorSlice,
  InspectorSlice,
} from '@/entity/createInspectorSlice';
import {
  createTypeRegistrySlice,
  TypeRegistrySlice,
} from './type-registry/createTypeRegistrySlice';
import { createWsSlice, WsSlice } from './websocket/createWsSlice';
import {
  createEntitiesSlice,
  EntitiesSlice,
} from './entity/createEntitiesSlice';
import {
  ComponentsSlice,
  createComponentsSlice,
} from './component/createComponentsSlice';

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
