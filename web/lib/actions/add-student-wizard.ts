'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type { CreatedStudentDto } from '@/lib/types/students';

export interface NewGuardianInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  relationship: string;
}

export interface NewStudentWizardInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE';
  stateOfOrigin?: string;
  lga?: string;
  religion?: string;
  bloodGroup?: string;
  genotype?: string;
  address?: string;
  email?: string;
  guardians: NewGuardianInput[];
  classId: string;
  armId: string;
  termId: string;
}

export interface CreatedWizardGuardian {
  name: string;
  email: string;
  temporaryPassword: string;
}

export interface NewStudentWizardResult {
  studentId: string;
  admissionNumber: string;
  studentTemporaryPassword?: string;
  createdGuardians: CreatedWizardGuardian[];
  guardianErrors: string[];
  enrollmentError?: string;
}

/**
 * There's no single atomic "create a fully-set-up student" endpoint by
 * design — students.controller.ts exposes one focused endpoint per
 * resource (student, guardian link, enrollment) so each can also be used
 * independently from the Student Profile page later. This action just
 * orchestrates the 3 calls the wizard needs in sequence, and reports
 * partial failures honestly rather than pretending the whole thing is one
 * transaction — the student record itself is the commit point; if a
 * guardian link or the enrollment fails, the admin lands on the new
 * student's profile and can finish that part there.
 */
export async function submitNewStudentWizard(
  input: NewStudentWizardInput,
): Promise<NewStudentWizardResult> {
  const student = await apiFetch<CreatedStudentDto>('/students', {
    method: 'POST',
    body: JSON.stringify({
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      ...(input.stateOfOrigin ? { stateOfOrigin: input.stateOfOrigin } : {}),
      ...(input.lga ? { lga: input.lga } : {}),
      ...(input.religion ? { religion: input.religion } : {}),
      ...(input.bloodGroup ? { bloodGroup: input.bloodGroup } : {}),
      ...(input.genotype ? { genotype: input.genotype } : {}),
      ...(input.address ? { address: input.address } : {}),
      ...(input.email ? { email: input.email } : {}),
    }),
  });

  const createdGuardians: CreatedWizardGuardian[] = [];
  const guardianErrors: string[] = [];
  for (const guardian of input.guardians) {
    try {
      // Every guardian here is created fresh (this is a brand-new student,
      // not a sibling link) — the temp password returned once must
      // actually be captured, or the account is unusable. This is the
      // exact gap the audit found in guardians-tab.tsx's "create new"
      // flow, just as relevant here since it's the common case for this
      // wizard specifically.
      const link = await apiFetch<{ guardianTemporaryPassword?: string }>(
        `/students/${student.id}/guardians`,
        { method: 'POST', body: JSON.stringify(guardian) },
      );
      if (link.guardianTemporaryPassword) {
        createdGuardians.push({
          name: `${guardian.firstName} ${guardian.lastName}`,
          email: guardian.email,
          temporaryPassword: link.guardianTemporaryPassword,
        });
      }
    } catch (error) {
      guardianErrors.push(
        `${guardian.firstName} ${guardian.lastName}: ${
          error instanceof Error ? error.message : 'Failed to link'
        }`,
      );
    }
  }

  let enrollmentError: string | undefined;
  try {
    await apiFetch(`/students/${student.id}/enrollments`, {
      method: 'POST',
      body: JSON.stringify({
        classId: input.classId,
        armId: input.armId,
        termId: input.termId,
        status: 'ACTIVE',
      }),
    });
  } catch (error) {
    enrollmentError = error instanceof Error ? error.message : 'Failed to enroll';
  }

  revalidatePath('/admin/students');

  return {
    studentId: student.id,
    admissionNumber: student.admissionNumber,
    studentTemporaryPassword: student.temporaryPassword,
    createdGuardians,
    guardianErrors,
    enrollmentError,
  };
}
