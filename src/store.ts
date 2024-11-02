import { create, type StateCreator } from 'zustand';
import { createInspectorSlice, type InspectorSlice } from '@/entity/createInspectorSlice';
import { createWsSlice, type WsSlice } from './websocket/createWsSlice';
import { createEntitiesSlice, type EntitiesSlice } from './entity/createEntitiesSlice';
import { createSessionSlice, type SessionSlice } from './brp/createSessionSlice';

export type CreateSlice<T> = StateCreator<SharedSlice, [], [], T>;

export type SharedSlice = WsSlice & EntitiesSlice & InspectorSlice & SessionSlice;

export const useStore = create<SharedSlice>()((...a) => ({
  ...createWsSlice(...a),
  ...createEntitiesSlice(...a),
  ...createInspectorSlice(...a),
  ...createSessionSlice(...a),
}));
