'use client';

import { Loader2, Search, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getDeliveryStatus, sendBroadcast } from '@/lib/actions/communication';
import { ROLE_LABELS } from '@/lib/role-labels';
import type { ClassDto } from '@/lib/types/academic';
import type {
  BroadcastChannel,
  BroadcastSendResultDto,
  BroadcastTargetType,
  DeliveryStatusResultDto,
  MessageTemplateDto,
  RecipientType,
} from '@/lib/types/communication';
import type { AppRole } from '@/types/next-auth';

const TARGET_LABELS: Record<BroadcastTargetType, string> = {
  CLASS: 'A specific class',
  ROLE: 'A staff role',
  INDIVIDUAL: 'One person',
  WHOLE_SCHOOL: 'Whole school',
};

const STAFF_ROLES = Object.keys(ROLE_LABELS).filter(
  (r) => r !== 'STUDENT' && r !== 'PARENT',
) as AppRole[];

const SAMPLE_CONTEXT: Record<string, string> = {
  student_name: 'Adaeze Okafor',
  balance: '₦45,000.00',
  due_date: '12 Jan 2026',
};

function renderSample(body: string): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => SAMPLE_CONTEXT[key] ?? `{{${key}}}`);
}

interface IndividualOption {
  id: string;
  name: string;
}

export function BroadcastComposer({
  allowedTargetTypes,
  classes,
  staffOptions,
  studentOptions,
  templates,
}: {
  allowedTargetTypes: BroadcastTargetType[];
  classes: ClassDto[];
  staffOptions: IndividualOption[];
  studentOptions: IndividualOption[];
  templates: MessageTemplateDto[];
}) {
  const [targetType, setTargetType] = useState<BroadcastTargetType>(allowedTargetTypes[0]);
  const [armId, setArmId] = useState('');
  const [role, setRole] = useState<string>('');
  const [recipientType, setRecipientType] = useState<RecipientType>('STUDENT');
  const [individualSearch, setIndividualSearch] = useState('');
  const [individualId, setIndividualId] = useState('');
  const [channels, setChannels] = useState<Set<BroadcastChannel>>(new Set());
  const [templateId, setTemplateId] = useState('');
  const [message, setMessage] = useState('');

  const [step, setStep] = useState<'compose' | 'confirm' | 'sent'>('compose');
  const [preview, setPreview] = useState<BroadcastSendResultDto | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<BroadcastSendResultDto | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatusResultDto | null>(null);

  const armOptions = useMemo(
    () =>
      classes.flatMap((c) =>
        c.arms.map((a) => ({ value: a.id, label: `${c.name} ${a.name}` })),
      ),
    [classes],
  );

  const individualPool = recipientType === 'STUDENT' ? studentOptions : staffOptions;
  const individualMatches = individualSearch.trim()
    ? individualPool.filter((o) => o.name.toLowerCase().includes(individualSearch.trim().toLowerCase()))
    : individualPool.slice(0, 8);

  // ROLE needs no extra selection to be valid — `role` left empty
  // intentionally means "all staff" (see targetIdFor below), not "nothing
  // chosen yet".
  const targetValid =
    targetType === 'WHOLE_SCHOOL' ||
    targetType === 'ROLE' ||
    (targetType === 'CLASS' && armId) ||
    (targetType === 'INDIVIDUAL' && individualId);
  const canSubmit = targetValid && message.trim().length > 0;

  function targetIdFor(): string | undefined {
    if (targetType === 'CLASS') return armId;
    if (targetType === 'ROLE') return role || undefined;
    if (targetType === 'INDIVIDUAL') return individualId;
    return undefined;
  }

  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) setMessage(template.body);
  }

  async function openConfirm() {
    setIsLoadingPreview(true);
    setStep('confirm');
    try {
      const result = await sendBroadcast({
        targetType,
        targetId: targetIdFor(),
        targetRecipientType: targetType === 'INDIVIDUAL' ? recipientType : undefined,
        channels: [...channels],
        message,
        dryRun: true,
      });
      setPreview(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't preview recipients.");
      setStep('compose');
    } finally {
      setIsLoadingPreview(false);
    }
  }

  async function confirmSend() {
    setIsSending(true);
    try {
      const result = await sendBroadcast({
        targetType,
        targetId: targetIdFor(),
        targetRecipientType: targetType === 'INDIVIDUAL' ? recipientType : undefined,
        channels: [...channels],
        message,
      });
      setSendResult(result);
      setStep('sent');
      if (result.id) {
        const status = await getDeliveryStatus(result.id).catch(() => null);
        setDeliveryStatus(status);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send broadcast.");
      setStep('compose');
    } finally {
      setIsSending(false);
    }
  }

  function reset() {
    setStep('compose');
    setPreview(null);
    setSendResult(null);
    setDeliveryStatus(null);
    setMessage('');
    setTemplateId('');
    setArmId('');
    setRole('');
    setIndividualId('');
    setIndividualSearch('');
    setChannels(new Set());
  }

  if (step === 'sent' && sendResult) {
    return (
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-success-soft px-4 py-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <Send className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-success-soft-foreground">Broadcast sent</p>
              <p className="text-xs text-success-soft-foreground/80">
                Delivered to {sendResult.recipientCount} recipient
                {sendResult.recipientCount === 1 ? '' : 's'}.
              </p>
            </div>
          </div>

          {deliveryStatus && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Delivery status</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(deliveryStatus.byChannel).map(([channel, counts]) => (
                  <div
                    key={channel}
                    className="rounded-lg border border-border p-3"
                    aria-label={`${channel}: ${counts.sent} sent, ${counts.delivered} delivered, ${counts.read} read${counts.failed > 0 ? `, ${counts.failed} failed` : ''}`}
                  >
                    <p className="text-xs font-medium text-muted-foreground" aria-hidden="true">
                      {channel}
                    </p>
                    <p className="text-sm text-foreground" aria-hidden="true">
                      <span className="font-semibold tabular-nums">{counts.sent}</span> sent ·{' '}
                      <span className="font-semibold tabular-nums">{counts.delivered}</span> delivered ·{' '}
                      <span className="font-semibold tabular-nums">{counts.read}</span> read
                      {counts.failed > 0 && (
                        <>
                          {' '}
                          ·{' '}
                          <span className="font-semibold tabular-nums text-destructive">{counts.failed}</span>{' '}
                          failed
                        </>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button variant="outline" onClick={reset}>
            Send another broadcast
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label>Who should receive this?</Label>
          <Select
            value={targetType}
            onValueChange={(v) => v && setTargetType(v as BroadcastTargetType)}
            items={allowedTargetTypes.map((t) => ({ value: t, label: TARGET_LABELS[t] }))}
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedTargetTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {TARGET_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {targetType === 'CLASS' && (
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select
              value={armId}
              onValueChange={(v) => v && setArmId(v)}
              items={armOptions}
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {armOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {targetType === 'ROLE' && (
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v ?? '')}
              items={[{ value: '', label: 'All staff' }, ...STAFF_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))]}
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All staff</SelectItem>
                {STAFF_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {targetType === 'INDIVIDUAL' && (
          // GUARDIAN is a valid recipientType on the backend, but isn't
          // offered here — there's no guardian directory/search anywhere
          // in this app yet (guardians are only ever reached via a
          // specific student's record). Reaching one guardian individually
          // would need that built first; out of scope for this stage.
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={recipientType}
                onValueChange={(v) => {
                  if (!v) return;
                  setRecipientType(v as RecipientType);
                  setIndividualId('');
                  setIndividualSearch('');
                }}
                items={[
                  { value: 'STUDENT', label: 'Student' },
                  { value: 'STAFF', label: 'Staff member' },
                ]}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="STAFF">Staff member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="individual-search">Search by name</Label>
              <div className="relative">
                <Search
                  className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="individual-search"
                  className="pl-8"
                  placeholder="Start typing a name…"
                  value={individualSearch}
                  onChange={(e) => {
                    setIndividualSearch(e.target.value);
                    setIndividualId('');
                  }}
                />
              </div>
              {individualSearch && !individualId && (
                <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-lg border border-border p-1">
                  {individualMatches.length === 0 ? (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">No matches.</p>
                  ) : (
                    individualMatches.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setIndividualId(opt.id);
                          setIndividualSearch(opt.name);
                        }}
                      >
                        {opt.name}
                      </button>
                    ))
                  )}
                </div>
              )}
              {individualId && (
                <Badge variant="info">
                  {individualSearch}
                  <button
                    type="button"
                    className="ml-1 underline"
                    onClick={() => {
                      setIndividualId('');
                      setIndividualSearch('');
                    }}
                  >
                    change
                  </button>
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Channels</Label>
          <p className="text-xs text-muted-foreground">
            Always delivered in-app to anyone with a login. Add SMS/email for anything time-sensitive.
          </p>
          <div className="flex flex-wrap gap-4 pt-1">
            <div className="flex items-center gap-2">
              <Checkbox checked disabled aria-label="In-app (always on)" />
              <span className="text-sm text-muted-foreground">In-app</span>
            </div>
            {(['SMS', 'EMAIL', 'WHATSAPP', 'PUSH'] as BroadcastChannel[]).map((channel) => (
              <div key={channel} className="flex items-center gap-2">
                <Checkbox
                  id={`channel-${channel}`}
                  checked={channels.has(channel)}
                  onCheckedChange={(checked) => {
                    const next = new Set(channels);
                    if (checked === true) next.add(channel);
                    else next.delete(channel);
                    setChannels(next);
                  }}
                />
                <Label htmlFor={`channel-${channel}`} className="text-sm font-normal">
                  {channel === 'SMS'
                    ? 'SMS'
                    : channel === 'EMAIL'
                      ? 'Email'
                      : channel === 'WHATSAPP'
                        ? 'WhatsApp'
                        : 'Push'}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {templates.length > 0 && (
          <div className="space-y-1.5">
            <Label>Start from a template (optional)</Label>
            <Select
              value={templateId}
              onValueChange={(v) => v && applyTemplate(v)}
              items={templates.map((t) => ({ value: t.id, label: t.name }))}
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="No template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templateId && (
              <p className="rounded-lg border border-dashed border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
                Preview for a sample recipient:{' '}
                <span className="text-foreground">
                  {renderSample(templates.find((t) => t.id === templateId)?.body ?? '')}
                </span>
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="broadcast-message">Message</Label>
          <Textarea
            id="broadcast-message"
            rows={4}
            placeholder="Write your message…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <Button disabled={!canSubmit} onClick={openConfirm}>
          <Send className="size-4" aria-hidden="true" />
          Preview &amp; Send
        </Button>
      </CardContent>

      <AlertDialog open={step === 'confirm'} onOpenChange={(open) => !open && !isSending && setStep('compose')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this broadcast?</AlertDialogTitle>
            <AlertDialogDescription>
              This isn&apos;t easily undone once it goes out — review who will receive it below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            {isLoadingPreview || !preview ? (
              <span className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Resolving recipients…
              </span>
            ) : preview.recipientCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nobody matches this target — nothing will be sent.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  This will reach{' '}
                  <strong className="text-foreground">
                    {preview.recipientCount} recipient{preview.recipientCount === 1 ? '' : 's'}
                  </strong>
                  :
                </p>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-2">
                  <ul className="space-y-1 text-sm text-foreground">
                    {preview.recipients.map((r, i) => (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span className="truncate">{r.name}</span>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {r.recipientType}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isLoadingPreview || isSending || !preview || preview.recipientCount === 0}
              onClick={confirmSend}
            >
              {isSending ? 'Sending…' : 'Confirm & Send'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
