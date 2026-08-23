'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, BookOpen, CalendarCheck, ShieldCheck, Wallet } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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
    <main className="flex min-h-screen flex-1">
      {/* Split layout: the brand panel only appears once there is room for
          it, and it is decorative — every word that matters (the form, its
          labels, its errors) lives in the right-hand column, so a phone
          loses nothing by not rendering it. */}
      <aside className="relative hidden w-1/2 max-w-2xl flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-20 size-96 rounded-full bg-black/15 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 text-sm font-bold backdrop-blur-sm">
            SMS
          </div>
          <span className="text-sm font-semibold tracking-tight">School OS</span>
        </div>

        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl leading-tight font-bold tracking-tight text-balance">
              Everything your school runs on, in one place.
            </h1>
            <p className="text-base text-primary-foreground/75">
              Admissions, attendance, results, fees and communication — for administrators,
              teachers, students and parents alike.
            </p>
          </div>

          <ul className="space-y-3.5">
            {HIGHLIGHTS.map((highlight) => (
              <li key={highlight.label} className="flex items-center gap-3 text-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <highlight.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="text-primary-foreground/90">{highlight.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-primary-foreground/60">
          Secure sign-in. Your session ends automatically when you log out.
        </p>
      </aside>

      <div className="flex flex-1 items-center justify-center bg-background p-4 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-sm">
              SMS
            </div>
          </div>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your school account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@school.ng"
                    aria-invalid={Boolean(errors.email)}
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
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
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
                    className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error-soft-foreground"
                  >
                    {serverError}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing in\u2026' : 'Sign in'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Trouble signing in? Contact your school administrator.
          </p>
        </div>
      </div>
    </main>
  );
}

const HIGHLIGHTS = [
  { icon: CalendarCheck, label: 'Attendance and timetables, marked in seconds' },
  { icon: BookOpen, label: 'Results and report cards, approved end to end' },
  { icon: Wallet, label: 'Fees, invoices and receipts in one ledger' },
  { icon: ShieldCheck, label: 'Role-based access for every member of staff' },
];
