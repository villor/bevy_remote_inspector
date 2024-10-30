import { Github } from 'lucide-react';
import { Button } from '../shared/ui/button';

export function Header() {
  return (
    <div className="flex w-full justify-between px-6 items-center bg-background h-14 border-b border-muted">
      Bevy Remote Inspector
      <nav className="flex items-center space-x-2">
        <a href="https://github.com/notmd/bevy_remote_inspector" target="_blank" rel="noreferrer">
          <Button variant="outline" size="icon">
            <Github className="size-4" />
          </Button>
        </a>
        {/* <ThemeToggle /> */}
      </nav>
    </div>
  );
}
