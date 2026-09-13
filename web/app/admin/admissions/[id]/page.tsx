import { notFound } from 'next/navigation';
import { getApplicant } from '@/lib/actions/admissions';
import { ApiError, apiFetch } from '@/lib/api';
import type { ClassDto } from '@/lib/types/academic';
import { ApplicantProfile } from './applicant-profile';

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const applicant = await getApplicant(id).catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });

  const classes = await apiFetch<ClassDto[]>('/classes');

  return (
    <ApplicantProfile
      applicant={applicant}
      classes={classes.map((c) => ({
        id: c.id,
        name: c.name,
        arms: c.arms.map((a) => ({ id: a.id, name: a.name, classId: c.id })),
      }))}
    />
  );
}
