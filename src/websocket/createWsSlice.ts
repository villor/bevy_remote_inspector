import { SharedSlice } from '@/store';
import { StateCreator } from 'zustand';
import { WEB_SOCKET_MESSAGE_ID, WsEvent } from './useWs';
import { ReadyState } from 'react-use-websocket';
import { SendJsonMessage } from 'react-use-websocket/dist/lib/types';
export type WsSlice = {
  url?: string;
  readyState: ReadyState;
  sendMessage: SendJsonMessage;
  initSendMessage: (fn: SendJsonMessage) => void;
  setReadyState: (readyState: ReadyState) => void;
  onMessage: (message: MessageEvent<any>) => void;
  shouldReconnect: boolean;
  hasConnected: boolean;
  isManuallyConnect: boolean;
};

export const createWsSlice: StateCreator<SharedSlice, [], [], WsSlice> = (
  set,
  get
) => ({
  url: parseWsURL(localStorage.getItem('ws_url') || ''),
  readyState: ReadyState.UNINSTANTIATED,
  shouldReconnect: true,
  isManuallyConnect: false,
  hasConnected: false,
  sendMessage: () => {
    console.error('sendMessage not initialized');
  },
  initSendMessage: (fn) => set({ sendMessage: fn }),
  setReadyState: (readyState) => {
    set({ readyState });

    if (readyState === ReadyState.OPEN) {
      set({ hasConnected: true, shouldReconnect: true });
      localStorage.setItem('ws_url', get().url!);
    }
  },
  onMessage: (message) => {
    try {
      const event = JSON.parse(message.data) as WsEvent;
      if (event.id !== WEB_SOCKET_MESSAGE_ID) {
        // TODO handle normal actions
        return;
      }
      for (const item of event.result) {
        if (item.kind === 'type_registry') {
          get().setRegistry(item.types);
        } else if (item.kind === 'component') {
          get().updateComponents(item.components);
        } else if (item.kind === 'entity') {
          get().updateEntity(item.entity, item.mutation);
        } else {
          console.log(item);
        }
      }
    } catch (e) {
      console.error(e);
    }
  },
});

export function parseWsURL(input: string): string | undefined {
  try {
    const url = new URL(input);
    const ws_url = `ws://${url.host}${url.pathname}`;
    return ws_url;
  } catch (e) {
    return;
  }
}
