import Image from 'next/image';
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

const STEPS_OVERVIEW = [
  { title: 'About the applicant', detail: 'Name, date of birth and gender' },
  { title: 'A parent or guardian', detail: 'Who the school should contact' },
  { title: 'Class and submit', detail: 'Then pay the application fee online' },
];

/** Laid out like the sign-in page: a brand panel beside the form. */
export default async function ApplyPage() {
  const schoolName = await getSchoolName();
  return (
    <main className="flex min-h-screen flex-1 flex-col bg-card lg:flex-row">
      <aside className="relative z-10 flex w-full shrink-0 flex-col items-center bg-brand px-6 py-10 text-center text-brand-foreground lg:max-w-[22.5rem] lg:px-8 lg:pt-16 lg:pb-10 xl:max-w-[35rem]">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 -right-[8.75rem] hidden w-[8.75rem] bg-brand [clip-path:polygon(0%_100%,100%_0%,0%_0%)] lg:block"
        />

        {/* Stacked, not side by side: a school name often wraps, and a wrapped
            name beside the mark pushes the mark to the panel's edge. */}
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-coral text-base font-bold text-brand-foreground"
        >
          SMS
        </span>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-balance lg:text-3xl">
          {schoolName}
        </p>

        <p className="mt-6 text-2xl font-semibold lg:mt-8">Apply for admission</p>
        <p className="mt-2 max-w-xs text-sm/relaxed text-brand-foreground/70">
          Three short steps, then you can pay the application fee online.
        </p>

        <ol className="mt-10 hidden w-full max-w-sm space-y-3 text-left lg:block">
          {STEPS_OVERVIEW.map((item, index) => (
            <li
              key={item.title}
              className="flex items-center gap-3 rounded-md bg-card p-3 shadow-lg dark:bg-black/25 dark:shadow-none dark:ring-1 dark:ring-white/10"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-semibold text-brand-foreground">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm leading-snug font-semibold text-heading">
                  {item.title}
                </span>
                <span className="block text-xs text-muted-foreground dark:text-brand-foreground/80">
                  {item.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <div className="relative mx-auto mt-auto hidden h-64 w-full max-w-xs pt-6 lg:block xl:h-72">
          <Image
            src="/auth/login-illustration.png"
            alt=""
            fill
            sizes="20rem"
            className="object-contain object-bottom"
          />
        </div>
      </aside>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:py-16 lg:pr-12 lg:pl-[10.75rem]">
        <div className="w-full max-w-[32rem]">
          <ApplyForm schoolName={schoolName} />
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <a
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline dark:text-foreground"
            >
              Sign in to the portal
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
