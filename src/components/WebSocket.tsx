import { createContext, useContext, useEffect, useState } from "react";
import useWebSocket, { ReadyState, SendMessage } from "react-use-websocket";
import { TType, TypeName, useTypeRegistry } from "./registries/TypeRegistry";

export type WsContext = {
  url: string | null;
  readyState: ReadyState;
  sendMessage: SendMessage;
  setUrl: (url: string) => void;
};

const ctx = createContext({} as WsContext);

export function WebsocketProvider({ children }: { children: React.ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const { setRegistry } = useTypeRegistry();
  const { sendMessage, lastMessage, readyState } = useWebSocket(url, {
    onError: (e) => alert(e),
    reconnectInterval: 5000,
  });

  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const event = JSON.parse(lastMessage.data) as WsEvent;
        if (event.id !== null) {
          // TODO handle normal actions
          return;
        }
        for (const item of event.result) {
          if (item.kind === "type_registry") {
            console.log("got type registry");
            setRegistry(item.types);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [lastMessage]);
  return (
    <ctx.Provider value={{ url, readyState, sendMessage, setUrl }}>
      {children}
    </ctx.Provider>
  );
}

export function useWs() {
  return useContext(ctx);
}

type WsEvent = {
  id: string | null;
  result: StreamEvent[];
};

type StreamEvent = TypeRegistryEvent;

export type TypeRegistryEvent = {
  kind: "type_registry";
  types: Array<[TypeName, TType]>;
};
