'use client';

import Script from 'next/script';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, Loader2, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            {phase === 'fee-paid' ? (
              <CheckCircle
                className="mx-auto size-12 text-success"
                aria-hidden="true"
              />
            ) : (
              <School className="mx-auto size-12 text-primary" aria-hidden="true" />
            )}
            <CardTitle className="mt-3 text-2xl">
              {phase === 'fee-paid' ? 'Application submitted!' : 'Application received'}
            </CardTitle>
            <CardDescription>
              {phase === 'fee-paid'
                ? 'Your application fee has been paid. The school will be in touch soon.'
                : 'Save your reference number below — you will need it to track your application status.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Application reference
              </p>
              <p className="break-all font-mono text-sm font-semibold text-foreground">
                {displayStatus?.id}
              </p>
            </div>

            {displayStatus?.offerLetterUrl && (
              <Button
                className="w-full"
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
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
                    <span className="text-sm text-muted-foreground">
                      Waiting for payment confirmation…
                    </span>
                  </div>
                ) : (
                  <Button
                    className="w-full"
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
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  // ─── Multi-step form ────────────────────────────────────────────────────
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-center text-2xl">Admission Application</CardTitle>
        <CardDescription className="text-center">
          Apply for a place at {schoolName}
        </CardDescription>
        <div className="pt-4">
          <Stepper steps={STEPS} currentStep={step} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  placeholder="Emeka"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                  placeholder="Okafor"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth">Date of birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set('dateOfBirth', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => v && set('gender', v)}
                  items={[
                    { value: 'MALE', label: 'Male' },
                    { value: 'FEMALE', label: 'Female' },
                  ]}
                >
                  <SelectTrigger id="gender" className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Home address (optional)</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="12 Ikeja Road, Lagos"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-muted-foreground">
              The guardian will receive login credentials and notifications about this application.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gFirstName">Guardian first name</Label>
                <Input
                  id="gFirstName"
                  value={form.guardianFirstName}
                  onChange={(e) => set('guardianFirstName', e.target.value)}
                  placeholder="Chukwu"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gLastName">Guardian last name</Label>
                <Input
                  id="gLastName"
                  value={form.guardianLastName}
                  onChange={(e) => set('guardianLastName', e.target.value)}
                  placeholder="Okafor"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gEmail">Guardian email</Label>
              <Input
                id="gEmail"
                type="email"
                value={form.guardianEmail}
                onChange={(e) => set('guardianEmail', e.target.value)}
                placeholder="guardian@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gPhone">Guardian phone</Label>
              <Input
                id="gPhone"
                type="tel"
                value={form.guardianPhone}
                onChange={(e) => set('guardianPhone', e.target.value)}
                placeholder="+2348012345678"
              />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="classLevel">Class applying for</Label>
              <Select
                value={form.intendedClassLevel}
                onValueChange={(v) => v && set('intendedClassLevel', v)}
                items={CLASS_LEVELS.map((c) => ({ value: c, label: c }))}
              >
                <SelectTrigger id="classLevel" className="w-full">
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
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Review before submitting</p>
              <p className="mt-1">
                Applicant: <strong>{form.firstName} {form.lastName}</strong>
              </p>
              <p>
                Guardian: <strong>{form.guardianFirstName} {form.guardianLastName}</strong>{' '}
                ({form.guardianEmail})
              </p>
            </div>
          </>
        )}

        <div className="flex gap-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting}
            >
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button type="button" className="flex-1" onClick={next}>
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1"
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
      </CardContent>
    </Card>
  );
}
