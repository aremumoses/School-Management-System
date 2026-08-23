'use client';

import { Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { sendBroadcast } from '@/lib/actions/communication';
import { getStudentDetail } from '@/lib/actions/students';
import { formatNaira } from '@/lib/format';
import type { DefaulterRowDto } from '@/lib/types/fees';

function reminderMessage(row: DefaulterRowDto): string {
  const due = row.dueDate
    ? ` (was due ${new Date(row.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`
    : '';
  return `Reminder: ${row.studentName}'s outstanding school fees balance is ${formatNaira(row.balance)}${due}. Please make payment at your earliest convenience.`;
}

/**
 * docs/08-dashboard-bursar.md's "Chasing defaulters" workflow, wired into
 * Stage 7's broadcast endpoint. Sends one INDIVIDUAL+GUARDIAN broadcast per
 * guardian-on-file per selected student (not a single CLASS/ROLE
 * broadcast, which would also reach non-defaulters in the same class) —
 * SMS only, matching docs/16-module-communication.md §5's "SMS" tier
 * (WhatsApp isn't wired up, see NotificationChannel's schema comment on
 * the API side). The message is built here, per-student, rather than via
 * a MessageTemplate — ad-hoc INDIVIDUAL broadcasts don't get per-recipient
 * placeholder substitution server-side (see BroadcastsService's targeting
 * comment), so resolving {{student_name}}/{{balance}}/{{due_date}} here,
 * where the real values are already on hand, is simpler and correct.
 */
export function SendReminderButton({
  rows,
  onSent,
}: {
  rows: DefaulterRowDto[];
  onSent: () => void;
}) {
  const [isSending, setIsSending] = useState(false);

  async function handleSend() {
    setIsSending(true);
    let guardiansReached = 0;
    let studentsWithNoGuardian = 0;
    let failures = 0;

    try {
      for (const row of rows) {
        try {
          const detail = await getStudentDetail(row.studentId);
          if (detail.guardians.length === 0) {
            studentsWithNoGuardian += 1;
            continue;
          }
          const message = reminderMessage(row);
          // Two guardian records can share one phone (e.g. a household
          // phone listed for both parents) — dedupe by phone within this
          // student's own guardian list so that phone doesn't get the
          // identical SMS twice. Guardians with no phone (or a phone not
          // seen yet) are never skipped.
          const seenPhones = new Set<string>();
          const recipients = detail.guardians.filter((link) => {
            if (!link.guardian.phone) return true;
            if (seenPhones.has(link.guardian.phone)) return false;
            seenPhones.add(link.guardian.phone);
            return true;
          });
          for (const link of recipients) {
            try {
              await sendBroadcast({
                targetType: 'INDIVIDUAL',
                targetId: link.guardianId,
                targetRecipientType: 'GUARDIAN',
                channels: ['SMS'],
                message,
              });
              guardiansReached += 1;
            } catch {
              failures += 1;
            }
          }
        } catch {
          failures += 1;
        }
      }

      if (guardiansReached > 0) {
        toast.success(
          `Reminder sent to ${guardiansReached} guardian${guardiansReached === 1 ? '' : 's'}.`,
        );
      }
      if (studentsWithNoGuardian > 0) {
        toast.warning(
          `${studentsWithNoGuardian} student${studentsWithNoGuardian === 1 ? '' : 's'} had no guardian on file — skipped.`,
        );
      }
      if (failures > 0) {
        toast.error(`${failures} reminder${failures === 1 ? '' : 's'} failed to send.`);
      }
    } finally {
      setIsSending(false);
      onSent();
    }
  }

  return (
    <Button size="sm" disabled={isSending} onClick={handleSend}>
      <Send className="size-4" aria-hidden="true" />
      {isSending ? 'Sending…' : 'Send Reminder'}
    </Button>
  );
}
