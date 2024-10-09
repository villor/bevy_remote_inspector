import { TType, TypeName } from '../type-registry/useTypeRegistry';
import { useShallow } from 'zustand/react/shallow';
import {
  ComponentId,
  ComponentName,
  ComponentValue,
} from '../component/useComponents';
import { EntityId } from '../entity/useEntity';
import { useStore } from '@/store';

export const WEB_SOCKET_MESSAGE_ID = '1';

export function useWs() {
  return useStore(
    useShallow((state) => ({
      url: state.url,
      readyState: state.readyState,
      sendMessage: state.sendMessage,
    }))
  );
}

export type WsEvent = {
  id: string | null;
  result: StreamEvent[];
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
    reflected: boolean;
    serializable: boolean;
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
  changes: Array<[ComponentId, ComponentValue]>;
  removes: ComponentId[];
  is_new: boolean;
};
export type EntityMutationRemove = { kind: 'remove' };
