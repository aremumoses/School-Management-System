import { PowerOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

export function WelcomeHome({ name, roleLabel }: { name: string; roleLabel: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold text-foreground">Welcome, {name}</h1>
      <p className="max-w-2xl text-base text-muted-foreground">
        You&apos;re signed in as{' '}
        <span className="font-medium text-foreground">{roleLabel}</span>. The
        real dashboard content for this role lands in a later stage — for now
        this is just the navigation shell, with every section already wired
        up and access-controlled.
      </p>
    </div>
  );
}

/** Shown for a role whose entire dashboard maps to a Stage 13 module the
 *  school has switched off in Settings → Module Toggles — there's no other
 *  dashboard for this role to fall back to, so this replaces the page
 *  content rather than redirecting somewhere arbitrary. */
export function ModuleDisabled({ label }: { label: string }) {
  return (
    <Empty className="border border-dashed border-border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PowerOff />
        </EmptyMedia>
        <EmptyTitle>{label} is currently disabled</EmptyTitle>
        <EmptyDescription>
          An administrator has switched this module off in Settings → Module Toggles. Your data is
          preserved — ask an Admin to re-enable it if you believe this is a mistake.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** Catch-all placeholder for every nav item that doesn't have real feature content yet. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>This section is coming in a later stage.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          The navigation and access control for this screen are already in
          place — the real feature content will be built in a later stage.
        </p>
      </CardContent>
    </Card>
  );
}
