'use client';

import { ChevronsUpDown, LogOut } from 'lucide-react';
import type { Session } from 'next-auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROLE_LABELS } from '@/lib/role-labels';
import { useLogout } from './use-logout';

function initials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function UserMenu({ session }: { session: Session }) {
  const { loggingOut, logout } = useLogout();
  const primaryRole = session.user.roles[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="lg"
            className="flex h-10 items-center gap-2 rounded-md bg-card px-1 hover:bg-card lg:pr-3"
            disabled={loggingOut}
            aria-label="Account menu"
          />
        }
      >
        <Avatar className="size-8 rounded-md after:rounded-md">
          <AvatarFallback className="rounded-md bg-primary/10 text-xs font-semibold text-primary dark:text-heading">
            {initials(session.user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-heading lg:inline">
          {session.user.name}
        </span>
        <ChevronsUpDown className="hidden size-3.5 text-muted-foreground lg:inline" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1.5 py-1">
            <span className="text-sm font-medium">{session.user.name}</span>
            <span className="text-xs text-muted-foreground">{session.user.email}</span>
            {primaryRole && (
              <Badge className="mt-1 w-fit bg-secondary text-secondary-foreground">
                {ROLE_LABELS[primaryRole] ?? primaryRole}
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void logout()} disabled={loggingOut}>
          <LogOut className="size-4" />
          {loggingOut ? 'Logging out…' : 'Log out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
