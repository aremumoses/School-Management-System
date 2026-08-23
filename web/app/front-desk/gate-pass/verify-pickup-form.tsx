'use client';

import { CheckCircle2, Loader2, QrCode, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { QrScanner } from '@/components/students/qr-scanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { issueGatePass, resolveStudentByQr } from '@/lib/actions/front-desk';
import type { GatePassDto, PickupRequestDto, QrResolveResponse } from '@/lib/types/front-desk';

export function VerifyPickupForm({
  studentOptions,
  pendingRequests,
}: {
  studentOptions: { id: string; label: string }[];
  pendingRequests: PickupRequestDto[];
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isIssuing, setIsIssuing] = useState(false);
  const [result, setResult] = useState<GatePassDto | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState<QrResolveResponse | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const matchingRequest = pendingRequests.find(
    (r) => r.studentId === studentId && r.status === 'PENDING',
  );

  async function handleScan(token: string) {
    setShowScanner(false);
    setIsResolving(true);
    try {
      const resolved = await resolveStudentByQr(token);
      setScanned(resolved);
      setStudentId(resolved.student.id);
      setResult(null);
      toast.success(`Scanned ${resolved.student.firstName} ${resolved.student.lastName}.`);
    } catch (error) {
      // A Server Action's thrown error message survives the RSC boundary
      // intact (unlike its class — apiFetch's ApiError arrives client-side
      // as a plain Error), so the backend's own "No student matches this
      // QR code" NotFoundException message is what actually surfaces here.
      toast.error(error instanceof Error ? error.message : "Couldn't resolve this QR code.");
    } finally {
      setIsResolving(false);
    }
  }

  async function handleVerify() {
    if (!studentId) return toast.error('Pick the student.');
    if (!name.trim()) return toast.error("Enter the pickup person's name.");
    setIsIssuing(true);
    setResult(null);
    try {
      const pass = await issueGatePass({
        studentId,
        pickupPersonName: name.trim(),
        pickupPersonPhone: phone.trim() || undefined,
        pickupRequestId: matchingRequest?.id,
      });
      setResult(pass);
      setName('');
      setPhone('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't process the gate pass.");
    } finally {
      setIsIssuing(false);
    }
  }

  return (
    <div className="space-y-4">
      {showScanner ? (
        <QrScanner onScan={(token) => void handleScan(token)} onClose={() => setShowScanner(false)} />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowScanner(true)} disabled={isResolving}>
          {isResolving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Resolving…
            </>
          ) : (
            <>
              <QrCode className="size-4" aria-hidden="true" />
              Scan QR
            </>
          )}
        </Button>
      )}

      {scanned && (
        <div className="space-y-1.5 rounded-lg border border-info-soft bg-info-soft px-4 py-3 text-sm text-info-soft-foreground">
          <p className="font-semibold">
            {scanned.student.firstName} {scanned.student.lastName}
            {scanned.student.className && ` — ${scanned.student.className}`}
          </p>
          {scanned.pickupPersons.length === 0 ? (
            <p>No authorized pickup persons on file for this student.</p>
          ) : (
            <p>
              Authorized: {scanned.pickupPersons.map((p) => `${p.name} (${p.relationship})`).join(', ')}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 space-y-1">
          <Label>Student</Label>
          <Select
            value={studentId}
            onValueChange={(v) => {
              if (v) {
                setStudentId(v);
                setResult(null);
                setScanned(null);
              }
            }}
            items={studentOptions.map((s) => ({ value: s.id, label: s.label }))}
          >
            <SelectTrigger className="w-full" aria-label="Choose student">
              <SelectValue placeholder="Choose the student…" />
            </SelectTrigger>
            <SelectContent>
              {studentOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-48 flex-1 space-y-1">
          <Label htmlFor="gp-name">Pickup person&apos;s name (as on ID)</Label>
          <Input id="gp-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="w-44 space-y-1">
          <Label htmlFor="gp-phone">Phone (optional)</Label>
          <Input id="gp-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…" />
        </div>
        <Button onClick={() => void handleVerify()} disabled={isIssuing}>
          {isIssuing ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Checking…
            </>
          ) : (
            'Verify & Issue'
          )}
        </Button>
      </div>

      {matchingRequest && (
        <p className="text-xs text-info-soft-foreground">
          A pending early-pickup request exists for this student (
          {matchingRequest.reason}) — issuing the pass will link and complete it.
        </p>
      )}

      {result &&
        (result.status === 'ISSUED' ? (
          <div className="flex items-start gap-3 rounded-lg border border-success-soft bg-success-soft px-4 py-3 text-sm text-success-soft-foreground">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                ✓ {result.pickupPersonName} matches an authorized pickup person.
              </p>
              <p>
                Gate pass issued for {result.student.firstName} {result.student.lastName} — the
                Class Teacher has been notified.
              </p>
            </div>
          </div>
        ) : (
          // Deliberately NOT styled as an error — escalation is the
          // expected, handled path for an unlisted person.
          <div className="flex items-start gap-3 rounded-lg border border-warning-soft bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
            <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                {result.pickupPersonName} is not on {result.student.firstName}&apos;s authorized
                list.
              </p>
              <p>
                Escalated to Admin — <strong>do not release the student until resolved</strong>.
                The Admin team has been notified and can confirm or reject from the log below.
              </p>
            </div>
          </div>
        ))}
    </div>
  );
}
