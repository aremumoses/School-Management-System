import {
  Banknote,
  BookCheck,
  CalendarDays,
  FileText,
  Gavel,
  GraduationCap,
  Megaphone,
  PenLine,
  Plus,
  Trash2,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeTime } from '@/lib/format';
import type { AuditLogEntry } from '@/lib/types/admin';
import { ROLE_LABELS } from '@/lib/role-labels';
import type { AppRole } from '@/types/next-auth';
import { cn } from '@/lib/utils';
import { EmptyState } from './empty-state';

/**
 * Recent activity timeline — new-design §6.
 *
 * Built on the existing audit log rather than a new "activity" table: every
 * event §6 asks for (student registered, payment received, result published,
 * announcement sent) is already written there by the modules that cause it,
 * so a second feed would be a second thing to keep correct.
 *
 * The translation from audit rows to human sentences lives here. Audit
 * entries are `ACTION` + `EntityType` pairs, which are precise but unreadable
 * ("CREATE / StudentDocument"); the tables below turn the common pairs into
 * plain language and leave an honest, if plain, fallback for the rest rather
 * than inventing wording for an action nobody has mapped yet.
 */

const ENTITY_ICONS: Record<string, LucideIcon> = {
  Student: GraduationCap,
  Staff: UserRound,
  Guardian: UserRound,
  Payment: Banknote,
  Invoice: FileText,
  Receipt: Banknote,
  ResultSet: BookCheck,
  Score: BookCheck,
  Broadcast: Megaphone,
  Announcement: Megaphone,
  CalendarEvent: CalendarDays,
  DisciplineAction: Gavel,
  Incident: Gavel,
  Admission: GraduationCap,
  Application: GraduationCap,
};

const ACTION_ICONS: { prefix: string; icon: LucideIcon; tint: string; verb: string }[] = [
  { prefix: 'CREATE', icon: Plus, tint: 'bg-success-soft text-success-soft-foreground', verb: 'created' },
  { prefix: 'DELETE', icon: Trash2, tint: 'bg-error-soft text-error-soft-foreground', verb: 'deleted' },
  { prefix: 'UPDATE', icon: PenLine, tint: 'bg-warning-soft text-warning-soft-foreground', verb: 'updated' },
  { prefix: 'APPROVE', icon: BookCheck, tint: 'bg-info-soft text-info-soft-foreground', verb: 'approved' },
  { prefix: 'PUBLISH', icon: Megaphone, tint: 'bg-info-soft text-info-soft-foreground', verb: 'published' },
  { prefix: 'RETURN', icon: PenLine, tint: 'bg-warning-soft text-warning-soft-foreground', verb: 'returned' },
  { prefix: 'LOGIN', icon: UserRound, tint: 'bg-muted text-muted-foreground', verb: 'signed in' },
  { prefix: 'LOGOUT', icon: UserRound, tint: 'bg-muted text-muted-foreground', verb: 'signed out' },
];

function describe(entry: AuditLogEntry) {
  const match = ACTION_ICONS.find((candidate) => entry.action.startsWith(candidate.prefix));
  const entityLabel = humanise(entry.entityType);
  const Icon = ENTITY_ICONS[entry.entityType] ?? match?.icon ?? FileText;

  const text = match
    ? match.prefix === 'LOGIN' || match.prefix === 'LOGOUT'
      ? match.verb
      : `${match.verb} ${withArticle(entityLabel)}`
    : `${humanise(entry.action).toLowerCase()} — ${entityLabel}`;

  return {
    Icon,
    tint: match?.tint ?? 'bg-muted text-muted-foreground',
    text,
  };
}

function humanise(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}

function withArticle(label: string): string {
  const lower = label.toLowerCase();
  return `${/^[aeiou]/.test(lower) ? 'an' : 'a'} ${lower}`;
}

function actorLabel(entry: AuditLogEntry): string {
  if (entry.actorRole) {
    return ROLE_LABELS[entry.actorRole as AppRole] ?? humanise(entry.actorRole);
  }
  if (entry.actorType && entry.actorType !== 'SYSTEM') return humanise(entry.actorType);
  return 'System';
}

/**
 * Token rotation is bookkeeping, not activity: it fires on a timer for every
 * signed-in session and would otherwise crowd out every real event in a
 * seven-row feed. Filtered here rather than at the query, because the audit
 * log itself must keep recording it.
 */
const NOISE = /TOKEN|SESSION_REFRESH/;

export function ActivityFeed({
  entries,
  title = 'Recent activity',
  limit = 7,
  emptyDescription = 'Actions taken across the school will appear here as they happen.',
}: {
  entries: AuditLogEntry[];
  title?: string;
  /** Cap applied *after* the noise filter, so the feed is always this full. */
  limit?: number;
  emptyDescription?: string;
}) {
  const visible = entries
    .filter((entry) => !NOISE.test(entry.action) && !NOISE.test(entry.entityType))
    .slice(0, limit);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <EmptyState compact title="Nothing yet today" description={emptyDescription} />
        ) : (
          <ol className="relative space-y-0">
            {visible.map((entry, index) => {
              const { Icon, tint, text } = describe(entry);
              const isLast = index === visible.length - 1;
              return (
                <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {/* The connector is drawn per-item rather than as one
                      absolutely-positioned rail so it stops cleanly at the
                      last row regardless of that row's height. */}
                  {!isLast && (
                    <span
                      className="absolute top-8 left-[15px] h-[calc(100%-1.5rem)] w-px bg-border"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card',
                      tint,
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{actorLabel(entry)}</span>{' '}
                      <span className="text-muted-foreground">{text}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelativeTime(entry.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
