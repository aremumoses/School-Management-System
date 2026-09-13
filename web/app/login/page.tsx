import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { LoginForm } from './login-form';

function LoginFormSkeleton() {
  return (
    <main className="flex min-h-screen flex-1 flex-col bg-card lg:flex-row">
      <div className="h-52 w-full shrink-0 bg-brand lg:h-auto lg:max-w-[22.5rem] xl:max-w-[35rem]" />
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:pr-12 lg:pl-[10.75rem]">
        <div className="w-full max-w-[26rem] space-y-5">
          <Skeleton className="mx-auto h-8 w-32" />
          <Skeleton className="mx-auto h-4 w-56" />
          <Skeleton className="mt-8 h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
