import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { useState } from 'react';
import { EntitiesTreeView } from './EntitiesTreeView';
import { EntitiesTableView } from './EntitiesTableView';

export function EntitiesPanel() {
  const [tab, setTab] = useState('tree');
  return (
    <>
      <div className="flex w-full h-full pr-2">
        <Tabs value={tab} onValueChange={setTab} className="flex flex-col w-full h-full">
          <div className="flex justify-between items-center px-4 py-2">
            <div className="text-lg font-bold">Entities</div>
            <TabsList>
              <TabsTrigger value="tree">Tree view</TabsTrigger>
              <TabsTrigger value="table">Table view</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex w-full h-full overflow-hidden">
            <TabsContent value="tree" className="h-full w-full mt-0">
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
