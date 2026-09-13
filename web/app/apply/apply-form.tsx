'use client';

import Script from 'next/script';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, Loader2, School } from 'lucide-react';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Stepper } from '@/components/dashboard/stepper';
import { applyForAdmission, getApplicantStatus, startFeeCheckout } from '@/lib/actions/admissions';
import type { ApplicantDto, ApplicantStatusDto } from '@/lib/types/admissions';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    PaystackPop?: { resumeTransaction: (accessCode: string) => void };
  }
}

const STEPS = ['Applicant', 'Guardian', 'Class & Submit'];

const CLASS_LEVELS = [
  'JSS 1', 'JSS 2', 'JSS 3',
  'SS 1', 'SS 2', 'SS 3',
];

// Sized like the sign-in form. Mobile keeps the base 16px text: anything
// smaller makes iOS zoom on focus.
const INPUT_CLASS = 'h-12 px-4 md:text-[0.9rem]';
const SELECT_CLASS = 'w-full px-4 data-[size=default]:h-12 md:text-[0.9rem]';

type Phase = 'form' | 'submitted' | 'fee-paying' | 'fee-paid';

interface FormData {
  // Step 1 — applicant
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  // Step 2 — guardian
  guardianFirstName: string;
  guardianLastName: string;
  guardianEmail: string;
  guardianPhone: string;
  // Step 3 — class
  intendedClassLevel: string;
}

const EMPTY_FORM: FormData = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  guardianFirstName: '',
  guardianLastName: '',
  guardianEmail: '',
  guardianPhone: '',
  intendedClassLevel: '',
};

function validateStep(form: FormData, step: number): string | null {
  if (step === 1) {
    if (!form.firstName.trim()) return 'First name is required.';
    if (!form.lastName.trim()) return 'Last name is required.';
    if (!form.dateOfBirth) return 'Date of birth is required.';
    if (!form.gender) return 'Gender is required.';
  }
  if (step === 2) {
    if (!form.guardianFirstName.trim()) return "Guardian's first name is required.";
    if (!form.guardianLastName.trim()) return "Guardian's last name is required.";
    if (!form.guardianEmail.trim() || !form.guardianEmail.includes('@'))
      return 'A valid guardian email is required.';
    if (!form.guardianPhone.trim()) return "Guardian's phone is required.";
  }
  if (step === 3) {
    if (!form.intendedClassLevel) return 'Please select the class you are applying for.';
  }
  return null;
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <FormFieldLabel htmlFor={id} required={required}>
        {label}
      </FormFieldLabel>
      {children}
    </div>
  );
}

export function ApplyForm({ schoolName }: { schoolName: string }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [phase, setPhase] = useState<Phase>('form');
  const [submitting, setSubmitting] = useState(false);
  const [applicant, setApplicant] = useState<ApplicantDto | null>(null);
  const [applicantStatus, setApplicantStatus] = useState<ApplicantStatusDto | null>(null);
  const [feePayingState, setFeePayingState] = useState<'idle' | 'loading' | 'waiting'>('idle');

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function next() {
    const error = validateStep(form, step);
    if (error) { toast.error(error); return; }
    setStep((s) => Math.min(s + 1, 3));
  }

  async function submit() {
    const error = validateStep(form, 3);
    if (error) { toast.error(error); return; }
    setSubmitting(true);
    try {
      const result = await applyForAdmission({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        address: form.address.trim() || undefined,
        intendedClassLevel: form.intendedClassLevel,
        guardianFirstName: form.guardianFirstName.trim(),
        guardianLastName: form.guardianLastName.trim(),
        guardianEmail: form.guardianEmail.trim(),
        guardianPhone: form.guardianPhone.trim(),
      });
      setApplicant(result);
      setPhase('submitted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function payFee() {
    if (!applicant) return;
    if (!window.PaystackPop) {
      toast.error("Payment isn't ready yet — give the page a moment and try again.");
      return;
    }
    setFeePayingState('loading');
    try {
      const checkout = await startFeeCheckout(applicant.id);
      setFeePayingState('waiting');
      window.PaystackPop.resumeTransaction(checkout.accessCode);
      // Poll for applicationFeePaid — Paystack calls our webhook asynchronously
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const status = await getApplicantStatus(applicant.id);
          if (status.applicationFeePaid) {
            clearInterval(poll);
            setApplicantStatus(status);
            setPhase('fee-paid');
            setFeePayingState('idle');
          }
        } catch {
          // transient — keep polling
        }
        if (attempts >= 30) {
          clearInterval(poll);
          setFeePayingState('idle');
          toast.info(
            'Payment is still processing. Your reference number is ' +
              applicant.id +
              ' — save it so you can check status later.',
          );
        }
      }, 2000);
    } catch (err) {
      setFeePayingState('idle');
      toast.error(err instanceof Error ? err.message : 'Could not start payment. Please try again.');
    }
  }

  // ─── Confirmation screen ────────────────────────────────────────────────
  if (phase === 'submitted' || phase === 'fee-paying' || phase === 'fee-paid') {
    const displayStatus = applicantStatus ?? applicant;
    return (
      <>
        <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />
        <div className="text-center">
          <span
            className={cn(
              'mx-auto flex size-16 items-center justify-center rounded-full',
              phase === 'fee-paid'
                ? 'bg-success-soft text-success-soft-foreground'
                : 'bg-primary/10 text-primary',
            )}
          >
            {phase === 'fee-paid' ? (
              <CheckCircle className="size-8" aria-hidden="true" />
            ) : (
              <School className="size-8" aria-hidden="true" />
            )}
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-heading">
            {phase === 'fee-paid' ? 'Application submitted!' : 'Application received'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {phase === 'fee-paid'
              ? 'Your application fee has been paid. The school will be in touch soon.'
              : 'Save your reference number below — you will need it to track your application status.'}
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <div className="rounded-xl bg-primary/5 p-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Application reference</p>
            <p className="font-mono text-sm font-semibold break-all text-heading">
              {displayStatus?.id}
            </p>
          </div>

          {displayStatus?.offerLetterUrl && (
            <Button
              size="lg"
              className="h-12 w-full text-base"
              render={
                <a
                  href={displayStatus.offerLetterUrl}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              Download Offer Letter
            </Button>
          )}

          {phase !== 'fee-paid' && (
            <div className="space-y-2">
              {feePayingState === 'waiting' ? (
                <div className="flex h-12 items-center justify-center gap-2 rounded-md bg-primary/5 px-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm text-muted-foreground">
                    Waiting for payment confirmation…
                  </span>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="h-12 w-full text-base"
                  disabled={feePayingState === 'loading'}
                  onClick={() => void payFee()}
                >
                  {feePayingState === 'loading' ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Opening payment…
                    </>
                  ) : (
                    'Pay Application Fee'
                  )}
                </Button>
              )}
              <p className="text-center text-xs text-muted-foreground">
                Secure payment via Paystack
              </p>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Already have a portal account?{' '}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline dark:text-foreground"
            >
              Sign in
            </Link>
          </p>
        </div>
      </>
    );
  }

  // ─── Multi-step form ────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-heading">Admission Application</h1>
        <p className="mt-2 text-sm text-muted-foreground">Apply for a place at {schoolName}</p>
      </div>

      <Stepper steps={STEPS} currentStep={step} />

      <div className="mt-8 space-y-5">
        {step === 1 && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="firstName" label="First name" required>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  placeholder="Emeka"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field id="lastName" label="Last name" required>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                  placeholder="Okafor"
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="dateOfBirth" label="Date of birth" required>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set('dateOfBirth', e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field id="gender" label="Gender" required>
                <Select
                  value={form.gender}
                  onValueChange={(v) => v && set('gender', v)}
                  items={[
                    { value: 'MALE', label: 'Male' },
                    { value: 'FEMALE', label: 'Female' },
                  ]}
                >
                  <SelectTrigger id="gender" className={SELECT_CLASS}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field id="address" label="Home address (optional)">
              <Input
                id="address"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="12 Ikeja Road, Lagos"
                className={INPUT_CLASS}
              />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <p className="rounded-xl bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
              The guardian will receive login credentials and notifications about this application.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="gFirstName" label="Guardian first name" required>
                <Input
                  id="gFirstName"
                  value={form.guardianFirstName}
                  onChange={(e) => set('guardianFirstName', e.target.value)}
                  placeholder="Chukwu"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field id="gLastName" label="Guardian last name" required>
                <Input
                  id="gLastName"
                  value={form.guardianLastName}
                  onChange={(e) => set('guardianLastName', e.target.value)}
                  placeholder="Okafor"
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
            <Field id="gEmail" label="Guardian email" required>
              <Input
                id="gEmail"
                type="email"
                value={form.guardianEmail}
                onChange={(e) => set('guardianEmail', e.target.value)}
                placeholder="guardian@example.com"
                className={INPUT_CLASS}
              />
            </Field>
            <Field id="gPhone" label="Guardian phone" required>
              <Input
                id="gPhone"
                type="tel"
                value={form.guardianPhone}
                onChange={(e) => set('guardianPhone', e.target.value)}
                placeholder="+2348012345678"
                className={INPUT_CLASS}
              />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <Field id="classLevel" label="Class applying for" required>
              <Select
                value={form.intendedClassLevel}
                onValueChange={(v) => v && set('intendedClassLevel', v)}
                items={CLASS_LEVELS.map((c) => ({ value: c, label: c }))}
              >
                <SelectTrigger id="classLevel" className={SELECT_CLASS}>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_LEVELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="rounded-xl bg-primary/5 p-4 text-sm">
              <p className="font-semibold text-heading">Review before submitting</p>
              <dl className="mt-3 space-y-2">
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                  <dt className="text-muted-foreground">Applicant</dt>
                  <dd className="font-semibold text-heading">
                    {form.firstName} {form.lastName}
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
                  <dt className="text-muted-foreground">Guardian</dt>
                  <dd className="min-w-0 text-right">
                    <span className="block font-semibold text-heading">
                      {form.guardianFirstName} {form.guardianLastName}
                    </span>
                    <span className="block break-all text-muted-foreground">{form.guardianEmail}</span>
                  </dd>
                </div>
              </dl>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 px-6 text-base"
            onClick={() => setStep((s) => s - 1)}
            disabled={submitting}
          >
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button type="button" size="lg" className="h-12 flex-1 text-base" onClick={next}>
            Continue
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="h-12 flex-1 text-base"
            disabled={submitting}
            onClick={() => void submit()}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Submitting…
              </>
            ) : (
              'Submit Application'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
