'use client';

import { Loader2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { signOutVisitor } from '@/lib/actions/front-desk';
import type { VisitorDto } from '@/lib/types/front-desk';

function time(iso: string | null): string {
  return iso
    ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '—';
}

export function VisitorLog({
  visitors,
  showSignOut = false,
}: {
  visitors: VisitorDto[];
  showSignOut?: boolean;
}) {
  const router = useRouter();
  const [signingOutId, setSigningOutId] = useState<string | null>(null);

  async function handleSignOut(id: string) {
    setSigningOutId(id);
    try {
      await signOutVisitor(id);
      toast.success('Visitor signed out.');
      router.refresh();
    } catch {
      toast.error("Couldn't sign the visitor out.");
    } finally {
      setSigningOutId(null);
    }
  }

  if (visitors.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {showSignOut ? 'No visitors currently on campus.' : 'No visitors logged today.'}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 font-medium">Visitor</th>
            <th className="pb-2 font-medium">Reason</th>
            <th className="pb-2 font-medium">Visiting</th>
            <th className="pb-2 font-medium">In</th>
            <th className="pb-2 font-medium">Out</th>
            {showSignOut && <th className="pb-2" aria-label="Actions" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {visitors.map((visitor) => (
            <tr key={visitor.id}>
              <td className="py-2.5">
                <p className="font-medium text-foreground">{visitor.name}</p>
                <p className="text-xs text-muted-foreground">{visitor.phone}</p>
              </td>
              <td className="py-2.5 text-muted-foreground">{visitor.reason}</td>
              <td className="py-2.5 text-muted-foreground">
                {visitor.hostStaff
                  ? `${visitor.hostStaff.firstName} ${visitor.hostStaff.lastName}`
                  : '—'}
              </td>
              <td className="py-2.5 tabular-nums">{time(visitor.signedInAt)}</td>
              <td className="py-2.5 tabular-nums">
                {visitor.signedOutAt ? (
                  time(visitor.signedOutAt)
                ) : (
                  <Badge variant="info">On campus</Badge>
                )}
              </td>
              {showSignOut && (
                <td className="py-2.5 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleSignOut(visitor.id)}
                    disabled={signingOutId === visitor.id}
                  >
                    {signingOutId === visitor.id ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <LogOut className="size-3.5" aria-hidden="true" />
                    )}
                    Sign Out
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
