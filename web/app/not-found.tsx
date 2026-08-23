import { FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <FileQuestion className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="mt-2">Page not found</CardTitle>
          <CardDescription>
            What you&apos;re looking for doesn&apos;t exist, or may have been removed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/" />} className="w-full">
            Go home
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
