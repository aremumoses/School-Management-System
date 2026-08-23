import { ApplyForm } from './apply-form';
import { apiFetch } from '@/lib/api';

// Fetch school name server-side for a personalized, credible header.
// Falls back gracefully if the API isn't reachable.
async function getSchoolName(): Promise<string> {
  try {
    const school = await apiFetch<{ name: string }>('/school', {
      // No auth needed — GET /school is public
    }).catch(() => null);
    return school?.name ?? 'Our School';
  } catch {
    return 'Our School';
  }
}

export const metadata = {
  title: 'Admission Application',
};

export default async function ApplyPage() {
  const schoolName = await getSchoolName();
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 bg-background p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">{schoolName}</h1>
        <p className="mt-1 text-muted-foreground">
          Fill in the form below to apply for admission.
        </p>
      </div>
      <ApplyForm schoolName={schoolName} />
      <p className="text-xs text-muted-foreground">
        Already have an account?{' '}
        <a href="/login" className="text-primary underline-offset-4 hover:underline">
          Sign in to the portal
        </a>
      </p>
    </main>
  );
}
