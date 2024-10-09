import { useShallow } from "zustand/react/shallow";
import { ComponentId } from "./useComponents";
import { useStore } from "@/store";

export function useComponentName(componentId: ComponentId) {
  return useStore(
    useShallow((state) => {
      const info = state.components.get(componentId);

      if (!info) {
        return;
      }
      // TODO handle short name
      return info.name;
    }),
  );
}
