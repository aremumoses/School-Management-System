'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Copy, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Stepper } from '@/components/dashboard/stepper';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  submitNewStudentWizard,
  type NewStudentWizardResult,
} from '@/lib/actions/add-student-wizard';
import type { AcademicSessionDto, ClassDto } from '@/lib/types/academic';

const STEPS = ['Bio-data', 'Guardian(s)', 'Class Placement'];

const guardianSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().max(20).optional(),
  relationship: z.string().min(1, 'Required').max(50),
});

const wizardSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  dateOfBirth: z.string().min(1, 'Required'),
  gender: z.enum(['MALE', 'FEMALE']),
  stateOfOrigin: z.string().max(100).optional(),
  lga: z.string().max(100).optional(),
  religion: z.string().max(50).optional(),
  bloodGroup: z.string().max(10).optional(),
  genotype: z.string().max(10).optional(),
  address: z.string().max(500).optional(),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  guardians: z.array(guardianSchema).min(1, 'Add at least one guardian'),
  classId: z.string().min(1, 'Choose a class'),
  armId: z.string().min(1, 'Choose an arm'),
  termId: z.string().min(1, 'Choose a term'),
});

type WizardValues = z.infer<typeof wizardSchema>;

const STEP_FIELDS: (keyof WizardValues)[][] = [
  ['firstName', 'lastName', 'dateOfBirth', 'gender', 'stateOfOrigin', 'lga', 'religion', 'bloodGroup', 'genotype', 'address', 'email'],
  ['guardians'],
  ['classId', 'armId', 'termId'],
];

export function AddStudentWizard({
  classes,
  sessions,
}: {
  classes: ClassDto[];
  sessions: AcademicSessionDto[];
}) {
  const [step, setStep] = useState(1);
  const [result, setResult] = useState<NewStudentWizardResult | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WizardValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: undefined,
      stateOfOrigin: '',
      lga: '',
      religion: '',
      bloodGroup: '',
      genotype: '',
      address: '',
      email: '',
      guardians: [{ firstName: '', lastName: '', email: '', phone: '', relationship: '' }],
      classId: '',
      armId: '',
      termId: '',
    },
  });

  const guardianFields = useFieldArray({ control, name: 'guardians' });
  const classId = watch('classId');
  const armId = watch('armId');
  const termId = watch('termId');
  const gender = watch('gender');
  const armsForClass = classes.find((c) => c.id === classId)?.arms ?? [];

  async function goNext() {
    const valid = await trigger(STEP_FIELDS[step - 1]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  async function onSubmit(values: WizardValues) {
    try {
      const wizardResult = await submitNewStudentWizard({
        ...values,
        guardians: values.guardians.map((g) => ({ ...g, phone: g.phone || undefined })),
      });
      setResult(wizardResult);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create student.');
    }
  }

  if (result) {
    const hasIssues = result.guardianErrors.length > 0 || result.enrollmentError;
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft">
            <Check className="size-6 text-success-soft-foreground" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Student created</h2>
            <p className="text-sm text-muted-foreground">
              Admission No. <span className="font-mono">{result.admissionNumber}</span>
            </p>
          </div>

          {result.studentTemporaryPassword && (
            <div className="space-y-1 text-left">
              <Label className="text-sm text-muted-foreground">Student temporary password</Label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
                <code className="flex-1 font-mono text-sm">{result.studentTemporaryPassword}</code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(result.studentTemporaryPassword!);
                    setCopied(true);
                    toast.success('Copied.');
                  }}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>
          )}

          {result.createdGuardians.length > 0 && (
            <div className="space-y-2 text-left">
              <Label className="text-sm text-muted-foreground">
                Guardian temporary password{result.createdGuardians.length === 1 ? '' : 's'}
              </Label>
              {result.createdGuardians.map((guardian) => (
                <div key={guardian.email} className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {guardian.name} ({guardian.email})
                  </p>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
                    <code className="flex-1 font-mono text-sm">{guardian.temporaryPassword}</code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard.writeText(guardian.temporaryPassword);
                        toast.success('Copied.');
                      }}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasIssues && (
            <div className="space-y-1 rounded-lg bg-warning-soft p-3 text-left text-sm text-warning-soft-foreground">
              <p className="font-medium">The student was created, but a couple of things need attention:</p>
              <ul className="list-inside list-disc">
                {result.guardianErrors.map((e) => <li key={e}>{e}</li>)}
                {result.enrollmentError && <li>Enrollment: {result.enrollmentError}</li>}
              </ul>
              <p>Finish these from the student&apos;s profile page.</p>
            </div>
          )}

          <div className="flex justify-center gap-2">
            <Button variant="outline" render={<Link href="/admin/students" />}>
              Back to Directory
            </Button>
            <Button render={<Link href={`/admin/students/${result.studentId}`} />}>
              View Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Stepper steps={STEPS} currentStep={step} />

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" aria-invalid={Boolean(errors.firstName)} {...register('firstName')} />
                  {errors.firstName && <FieldError message={errors.firstName.message} />}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" aria-invalid={Boolean(errors.lastName)} {...register('lastName')} />
                  {errors.lastName && <FieldError message={errors.lastName.message} />}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input id="dateOfBirth" type="date" aria-invalid={Boolean(errors.dateOfBirth)} {...register('dateOfBirth')} />
                  {errors.dateOfBirth && <FieldError message={errors.dateOfBirth.message} />}
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={gender ?? ''}
                    onValueChange={(v) => v && setValue('gender', v as 'MALE' | 'FEMALE')}
                    items={[
                      { value: 'MALE', label: 'Male' },
                      { value: 'FEMALE', label: 'Female' },
                    ]}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && <FieldError message={errors.gender.message} />}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stateOfOrigin">State of Origin</Label>
                  <Input id="stateOfOrigin" {...register('stateOfOrigin')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lga">LGA</Label>
                  <Input id="lga" {...register('lga')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="religion">Religion</Label>
                  <Input id="religion" {...register('religion')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Input id="bloodGroup" {...register('bloodGroup')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genotype">Genotype</Label>
                  <Input id="genotype" {...register('genotype')} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" {...register('address')} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">Email (optional — for student login)</Label>
                  <Input id="email" type="email" aria-invalid={Boolean(errors.email)} {...register('email')} />
                  {errors.email && <FieldError message={errors.email.message} />}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {guardianFields.fields.map((field, index) => (
                  <div key={field.id} className="space-y-3 rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Guardian {index + 1}</p>
                      {guardianFields.fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove guardian ${index + 1}`}
                          onClick={() => guardianFields.remove(index)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`guardians.${index}.firstName`}>First Name</Label>
                        <Input
                          id={`guardians.${index}.firstName`}
                          {...register(`guardians.${index}.firstName`)}
                        />
                        {errors.guardians?.[index]?.firstName && (
                          <FieldError message={errors.guardians[index]?.firstName?.message} />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`guardians.${index}.lastName`}>Last Name</Label>
                        <Input
                          id={`guardians.${index}.lastName`}
                          {...register(`guardians.${index}.lastName`)}
                        />
                        {errors.guardians?.[index]?.lastName && (
                          <FieldError message={errors.guardians[index]?.lastName?.message} />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`guardians.${index}.email`}>Email</Label>
                        <Input
                          id={`guardians.${index}.email`}
                          type="email"
                          {...register(`guardians.${index}.email`)}
                        />
                        {errors.guardians?.[index]?.email && (
                          <FieldError message={errors.guardians[index]?.email?.message} />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`guardians.${index}.phone`}>Phone (optional)</Label>
                        <Input
                          id={`guardians.${index}.phone`}
                          placeholder="+2348012345678"
                          {...register(`guardians.${index}.phone`)}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor={`guardians.${index}.relationship`}>Relationship</Label>
                        <Input
                          id={`guardians.${index}.relationship`}
                          placeholder="Mother, Father, Uncle…"
                          {...register(`guardians.${index}.relationship`)}
                        />
                        {errors.guardians?.[index]?.relationship && (
                          <FieldError message={errors.guardians[index]?.relationship?.message} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {errors.guardians?.root?.message && (
                  <FieldError message={errors.guardians.root.message} />
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    guardianFields.append({
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      relationship: '',
                    })
                  }
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add Another Guardian
                </Button>
                <p className="text-sm text-muted-foreground">
                  Need to link a guardian who&apos;s already in the system (e.g. a sibling)?
                  You can do that from the student&apos;s profile after creating them.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select
                    value={classId}
                    onValueChange={(v) => {
                      if (v) {
                        setValue('classId', v);
                        setValue('armId', '');
                      }
                    }}
                    items={classes.map((klass) => ({ value: klass.id, label: klass.name }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a class…" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((klass) => (
                        <SelectItem key={klass.id} value={klass.id}>
                          {klass.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.classId && <FieldError message={errors.classId.message} />}
                </div>
                <div className="space-y-2">
                  <Label>Arm</Label>
                  <Select
                    value={armId}
                    disabled={!classId}
                    onValueChange={(v) => v && setValue('armId', v)}
                    items={armsForClass.map((arm) => ({ value: arm.id, label: arm.name }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose an arm…" />
                    </SelectTrigger>
                    <SelectContent>
                      {armsForClass.map((arm) => (
                        <SelectItem key={arm.id} value={arm.id}>
                          {arm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.armId && <FieldError message={errors.armId.message} />}
                </div>
                <div className="space-y-2">
                  <Label>Term</Label>
                  <Select
                    value={termId}
                    onValueChange={(v) => v && setValue('termId', v)}
                    items={sessions.flatMap((session) =>
                      session.terms.map((term) => ({
                        value: term.id,
                        label: `${session.name} — ${term.name} Term${term.isCurrent ? ' (current)' : ''}`,
                      })),
                    )}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a term…" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((session) =>
                        session.terms.map((term) => (
                          <SelectItem key={term.id} value={term.id}>
                            {session.name} — {term.name} Term{term.isCurrent ? ' (current)' : ''}
                          </SelectItem>
                        )),
                      )}
                    </SelectContent>
                  </Select>
                  {errors.termId && <FieldError message={errors.termId.message} />}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-between border-t border-border pt-4">
              <Button type="button" variant="outline" disabled={step === 1} onClick={goBack}>
                Back
              </Button>
              {step < STEPS.length ? (
                <Button type="button" onClick={() => void goNext()}>
                  Continue
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating…' : 'Create Student'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-sm text-destructive">
      <AlertCircle className="size-3.5" aria-hidden="true" />
      {message}
    </p>
  );
}
