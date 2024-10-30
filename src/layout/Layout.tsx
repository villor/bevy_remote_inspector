import type { ReactNode } from 'react';
import { Header } from './Header';
import { SideBar } from './Sidebar';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-screen w-screen grid-rows-[auto_1fr]">
      <Header />
      <div className="grid grid-cols-[auto_1fr] overflow-auto">
        <SideBar />
        <div
          className="overflow-auto px-2"
          style={{
            height: 'calc(100vh - 3.5rem)',
            maxHeight: 'calc(100vh - 3.5rem)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
