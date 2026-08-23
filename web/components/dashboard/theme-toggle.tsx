'use client';

import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

/**
 * Light / dark / system switcher for the app header (design system §11).
 *
 * Renders a same-size placeholder until mounted: the server has no idea
 * which theme the browser resolved, so reading `resolvedTheme` during the
 * first render would hydrate-mismatch. Reserving the exact footprint keeps
 * the header from shifting as it settles.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // setTimeout(0) rather than a direct call — see the same pattern in
  // notification-bell.tsx: the flag still flips on mount, but deferring it
  // out of the effect's own synchronous execution avoids the cascading-render
  // pattern react-hooks/set-state-in-effect flags a same-tick call as.
  useEffect(() => {
    const handle = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(handle);
  }, []);

  if (!mounted) {
    return <div className="size-9 shrink-0" aria-hidden="true" />;
  }

  const Icon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Change theme — currently ${theme ?? 'system'}`}
          />
        }
      >
        <Icon className="size-[18px]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
            <option.icon className="size-4" />
            <span className="flex-1">{option.label}</span>
            {theme === option.value && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
