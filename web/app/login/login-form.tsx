'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, BookOpen, CalendarCheck, ShieldCheck, Wallet } from 'lucide-react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const fieldLabelClass = 'text-[0.8125rem] font-medium text-heading';
// Mobile keeps the base 16px text: anything smaller makes iOS zoom on focus.
const fieldInputClass =
  'h-12 rounded-sm bg-card px-4 text-heading md:text-[0.9rem] focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    const result = await signIn('credentials', { ...values, redirect: false });

    if (result?.error) {
      setServerError('Email or password is incorrect.');
      return;
    }

    // proxy.ts sends an authenticated visitor at "/" or "/login" on to their
    // role's dashboard, so a plain "/" fallback is enough here.
    router.push(callbackUrl ?? '/');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-card lg:flex-row">
      <aside className="relative z-10 flex w-full shrink-0 flex-col items-center bg-brand px-6 py-10 text-center text-brand-foreground lg:max-w-[22.5rem] lg:px-8 lg:pt-16 lg:pb-10 xl:max-w-[35rem]">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 -right-[8.75rem] hidden w-[8.75rem] bg-brand [clip-path:polygon(0%_100%,100%_0%,0%_0%)] lg:block"
        />

        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-xl bg-brand-coral text-base font-bold text-brand-foreground"
          >
            SMS
          </span>
          <span className="text-2xl font-semibold tracking-tight lg:text-3xl">School OS</span>
        </div>

        <p className="mt-6 text-2xl font-semibold lg:mt-8">Welcome back!</p>
        <p className="mt-2 max-w-xs text-sm/relaxed text-brand-foreground/70">
          Admissions, attendance, results, fees and communication — for administrators,
          teachers, students and parents alike.
        </p>

        {/* Card positions are tuned against the character's silhouette so no
            card covers its face; the narrow lg panel shows the character alone. */}
        <div className="my-auto hidden w-full py-6 lg:block">
          <div className="relative mx-auto h-[24rem] w-full max-w-[31rem]">
            <Image
              src="/auth/login-illustration.png"
              alt=""
              fill
              sizes="11rem"
              className="object-contain px-6 pt-16 pb-2 xl:px-24"
            />
            <ul className="hidden xl:block">
              {HIGHLIGHTS.map((highlight, index) => (
                <li
                  key={highlight.title}
                  className={cn(
                    'absolute flex w-[10.5rem] flex-col items-start rounded-md bg-card p-3 text-left shadow-lg dark:bg-black/25 dark:shadow-none dark:ring-1 dark:ring-white/10',
                    highlight.position,
                    index % 2 === 0 ? 'animate-float-a' : 'animate-float-b',
                  )}
                >
                  <span className="flex size-9 items-center justify-center rounded-md bg-brand text-brand-foreground">
                    <highlight.icon className="size-[1.125rem]" aria-hidden="true" />
                  </span>
                  <span className="mt-2 text-sm leading-snug font-semibold text-heading">
                    {highlight.title}
                  </span>
                  <span className="mt-0.5 text-xs text-muted-foreground dark:text-brand-foreground/80">
                    {highlight.detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="hidden text-xs text-brand-foreground/60 lg:block">
          Secure sign-in. Your session ends automatically when you log out.
        </p>
      </aside>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:py-16 lg:pr-12 lg:pl-[10.75rem]">
        <div className="w-full max-w-[26rem]">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-heading">Sign in</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to your school account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className={fieldLabelClass}>
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@school.ng"
                aria-invalid={Boolean(errors.email)}
                className={fieldInputClass}
                {...register('email')}
              />
              {errors.email && (
                <p className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={fieldLabelClass}>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                className={fieldInputClass}
                {...register('password')}
              />
              {errors.password && (
                <p className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <p
                role="alert"
                className="rounded-sm bg-error-soft px-4 py-3 text-sm text-error-soft-foreground"
              >
                {serverError}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="mt-2 h-12 w-full rounded-md bg-brand text-base font-medium text-brand-foreground hover:bg-brand-hover focus-visible:border-brand focus-visible:ring-brand/30"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Trouble signing in? Contact your school administrator.
          </p>
        </div>
      </div>
    </main>
  );
}

// Zigzag around the character: the top-right card sits where its finger
// points, the rest alternate sides below the head.
const HIGHLIGHTS = [
  {
    icon: CalendarCheck,
    title: 'Attendance & timetables',
    detail: 'Marked in seconds',
    position: 'top-0 right-0',
  },
  {
    icon: BookOpen,
    title: 'Results & report cards',
    detail: 'Approved end to end',
    position: 'top-[30%] left-0',
  },
  {
    icon: Wallet,
    title: 'Fees & receipts',
    detail: 'One ledger for every invoice',
    position: 'top-[58%] right-0',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    detail: 'For every member of staff',
    position: 'bottom-0 left-0',
  },
];
