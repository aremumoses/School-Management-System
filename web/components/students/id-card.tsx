'use client';

import { Printer, User } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Stage 29 digital ID (docs/19-unique-differentiators.md §8) — shared
 * between the admin "ID Card" tab and the student's own self-view, since
 * both need the identical printable card. `qrDataUrl` is generated
 * server-side (qrcode's Node API, in each page's Server Component) and
 * passed down as a plain data: URI — no client-side QR generation, so
 * this component ships zero extra bundle weight for the QR itself.
 * Print uses the same window.print() + print:hidden convention as
 * bursar/reports/export-buttons.tsx, not a generated PDF.
 */
export function IdCard({
  student,
  qrDataUrl,
}: {
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    photoUrl: string | null;
    className: string | null;
  };
  qrDataUrl: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end print:hidden">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden="true" />
          Print
        </Button>
      </div>

      <Card className="mx-auto max-w-sm border-2">
        <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
            {student.photoUrl ? (
              <Image src={student.photoUrl} alt="" fill className="object-cover" unoptimized />
            ) : (
              <User className="size-8" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {student.firstName} {student.lastName}
            </p>
            <p className="font-mono text-sm text-muted-foreground">{student.admissionNumber}</p>
            {student.className && (
              <p className="text-sm text-muted-foreground">{student.className}</p>
            )}
          </div>

          {qrDataUrl ? (
            // A locally-generated data: URI, not a remote image next/image can optimize.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="Student ID QR code" className="size-40" />
          ) : (
            <p className="text-sm text-muted-foreground">
              No QR code on file yet — contact the school office.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Present this code at the front desk for gate/pickup verification.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
