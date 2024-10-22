import { Github } from 'lucide-react';
import { Button } from '../shared/ui/button';
import { ThemeToggle } from '@/theme/ThemeToggle';

export function Header() {
  return (
    <div className="flex w-full justify-between px-6 items-center bg-background h-14 border-b border-muted">
      Header here
      <nav className="flex items-center space-x-2">
        <a
          href="https://github.com/notmd/bevy_remote_inspector"
          target="_blank"
        >
          <Button variant="outline" size="icon">
            <Github className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </a>
        <ThemeToggle />
      </nav>
    </div>
  );
}
