import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { useState } from 'react';
import { EntitiesTreeView } from './EntitiesTreeView';
import { EntitiesTableView } from './EntitiesTableView';

export function EntitiesPanel() {
  const [tab, setTab] = useState('tree');
  return (
    <>
      <div className="flex h-full w-full pr-2">
        <Tabs value={tab} onValueChange={setTab} className="flex h-full w-full flex-col">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="font-bold text-lg">Entities</div>
            <TabsList>
              <TabsTrigger value="tree">Tree view</TabsTrigger>
              <TabsTrigger value="table">Table view</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex h-full w-full overflow-hidden">
            <TabsContent value="tree" className="mt-0 h-full w-full">
              <EntitiesTreeView />
            </TabsContent>
            <TabsContent value="table">
              <EntitiesTableView />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </>
  );
}
