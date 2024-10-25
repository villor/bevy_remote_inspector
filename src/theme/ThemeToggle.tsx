import { Moon, Sun } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { useTheme } from '@/theme/ThemeProvider';
import { Menu, MenuItem, MenuPopover, MenuTrigger } from '@/shared/ui/menu';

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <MenuTrigger>
      <Button variant="outline" size="icon">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
      <MenuPopover>
        <Menu>
          <MenuItem onAction={() => setTheme('light')}>Light</MenuItem>
          <MenuItem onAction={() => setTheme('dark')}>Dark</MenuItem>
          <MenuItem onAction={() => setTheme('system')}>System</MenuItem>
        </Menu>
      </MenuPopover>
    </MenuTrigger>
  );
}
