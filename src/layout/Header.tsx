import { Github } from 'lucide-react';
import { Button } from '../shared/ui/button';

export function Header() {
  return (
    <div className="flex h-14 w-full items-center justify-between border-muted border-b bg-background px-6">
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
