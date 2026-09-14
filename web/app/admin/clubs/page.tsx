import { Users } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { listClubs } from '@/lib/actions/clubs';
import { apiFetch } from '@/lib/api';
import type { StaffDto } from '@/lib/types/staff';
import { ClubFormDialog } from './club-form-dialog';
import { ClubsGrid } from './clubs-grid';

export default async function AdminClubsPage() {
  const [clubs, staff] = await Promise.all([
    listClubs(),
    apiFetch<StaffDto[]>('/staff'),
  ]);
  const staffOptions = staff
    .filter((s) => s.isActive)
    .map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clubs & Activities"
        description="Societies, clubs, and sports teams — each with a patron teacher and a member roster."
        action={<ClubFormDialog staffOptions={staffOptions} />}
      />

      {clubs.length === 0 ? (
        <Empty className="rounded-xl bg-card py-12 dark:ring-1 dark:ring-foreground/10">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="size-12 rounded-full bg-primary/10 text-primary [&_svg:not([class*='size-'])]:size-5"
            >
              <Users />
            </EmptyMedia>
            <EmptyTitle className="text-base font-semibold text-heading">No clubs yet</EmptyTitle>
            <EmptyDescription>Create the school&apos;s first club to get started.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ClubFormDialog staffOptions={staffOptions} />
          </EmptyContent>
        </Empty>
      ) : (
        <ClubsGrid clubs={clubs} />
      )}
    </div>
  );
}
