import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/shared/ui/resizable';
import { EntitiesInspectorPanel } from './EntitiesInspectorPanel';
import { EntitiesPanel } from './EntitiesPanel';

export function EntitiesInspectorPage() {
  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={65} persistentKey="entities_panel_size">
        <EntitiesPanel />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        defaultSize={50}
        persistentKey="entities_inspector_panel_size"
      >
        <EntitiesInspectorPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
