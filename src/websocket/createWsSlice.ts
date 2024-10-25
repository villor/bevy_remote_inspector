import { SharedSlice } from '@/store';
import { StateCreator } from 'zustand';
import { WEB_SOCKET_MESSAGE_ID } from './useWs';
import { ReadyState } from 'react-use-websocket';
import { SendJsonMessage } from 'react-use-websocket/dist/lib/types';
import { toast } from '@/hooks/use-toast';
import { TType, TypeName } from '@/type-registry/useTypeRegistry';
import {
  ComponentId,
  ComponentName,
  ComponentValue,
} from '@/component/useComponents';
import { EntityId } from '@/entity/useEntity';
export type WsSlice = {
  url?: string;
  readyState: ReadyState;
  sendMessage: (data: { method: string; params: any }) => number;
  initSendMessage: (fn: SendJsonMessage) => void;
  setReadyState: (readyState: ReadyState) => void;
  onMessage: (message: MessageEvent<any>) => void;
  shouldReconnect: boolean;
  hasConnected: boolean;
  isManuallyConnect: boolean;
};

let sendMessageInteral: SendJsonMessage = () => {
  console.error('sendMessage not initialized');
};

let id = 10;
export const createWsSlice: StateCreator<SharedSlice, [], [], WsSlice> = (
  set,
  get
) => ({
  url: parseWsURL(localStorage.getItem('ws_url') || 'ws://localhost:3000'),
  readyState: ReadyState.UNINSTANTIATED,
  shouldReconnect: true,
  isManuallyConnect: false,
  hasConnected: false,
  sendMessage: (data: { method: string; params: any }) => {
    let newId = id++;

    sendMessageInteral({
      ...data,
      id: newId,
      jsonrpc: '2.0',
    });
    console.log(`send message ${data.method} ${JSON.stringify(data.params)}`);

    return newId;
  },
  initSendMessage: (fn) => (sendMessageInteral = fn),
  setReadyState: (readyState) => {
    set({ readyState });

    if (readyState === ReadyState.OPEN) {
      set({
        hasConnected: true,
        shouldReconnect: true,
        childParentMap: new Map(),
        entities: new Map(),
        registry: new Map(),
        componentNameToIdMap: new Map(),
        components: new Map(),
        inspectingEntity: null,
      });
      localStorage.setItem('ws_url', get().url!);
    }
  },
  onMessage: (message) => {
    try {
      const event = JSON.parse(message.data) as WsEvent;
      if (event.error) {
        toast({
          title: 'Error',
          description: event.error.message,
          variant: 'destructive',
        });
        return;
      }

      if (event.id !== WEB_SOCKET_MESSAGE_ID) {
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

export type WsEvent = {
  id: string | null;
  result: StreamEvent[];
  error?: {
    code: number;
    message: string;
  };
};

type StreamEvent = TypeRegistryEvent | ComponentsEvent | EntityEvent;

export type TypeRegistryEvent = {
  kind: 'type_registry';
  types: Array<[TypeName, TType]>;
};

export type ComponentsEvent = {
  kind: 'component';
  components: Array<{
    id: ComponentId;
    name: ComponentName;
  }>;
};

export type EntityEvent = {
  kind: 'entity';
  entity: EntityId;
  mutation: EntityMutaion;
};

export type EntityMutaion = EntityMutationChange | EntityMutationRemove;

export type EntityMutationChange = {
  kind: 'change';
  changes: Array<[ComponentId, boolean, ComponentValue]>;
  removes: Array<[ComponentId, boolean]>;
};
export type EntityMutationRemove = { kind: 'remove' };
