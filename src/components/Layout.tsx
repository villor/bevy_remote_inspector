import { ReactNode } from "react";
import { useWs } from "./WebSocket";
import { useTypeRegistry } from "./registries/TypeRegistry";

export function Layout({ children }: { children: ReactNode }) {
  const { registry } = useTypeRegistry();
  const { readyState } = useWs();
  const json = JSON.stringify(
    Array.from(registry.entries()).reduce((obj, [key, value]) => {
      // @ts-ignore
      obj[key] = value;
      return obj;
    }, {}),
    null,
    2,
  );
  return (
    <div className="grid grid-cols-[60px_auto] gap-x-4 max-h-screen h-screen">
      <div className="bg-red-500">
        Side bar
        <div>{readyState}</div>
      </div>
      <div>
        <div>{children}</div>
        <pre>{json}</pre>
      </div>
    </div>
  );
}
