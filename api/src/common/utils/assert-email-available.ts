import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

export type UserTypeForEmailCheck = 'STAFF' | 'GUARDIAN' | 'STUDENT';

const LABELS: Record<UserTypeForEmailCheck, string> = {
  STAFF: 'staff member',
  GUARDIAN: 'guardian',
  STUDENT: 'student',
};

/**
 * Staff, Guardian, and Student are separate tables that all log in by email
 * (see auth.service.ts, which checks Staff, then Guardian, then Student) —
 * without this check, creating a record in one table could reuse an email
 * another table already logs in with, permanently shadowing that account
 * (the earlier-checked table always wins, with no error to explain why the
 * other account stopped working). Call this with the type being created so
 * it checks the *other two* tables — the DB's own unique constraint already
 * guards same-table collisions, translated to a 409 by translatePrismaError.
 */
export async function assertEmailAvailableAcrossUserTypes(
  prisma: PrismaService,
  email: string,
  creating: UserTypeForEmailCheck,
): Promise<void> {
  const checks: Promise<{ type: UserTypeForEmailCheck; found: boolean }>[] = [];

  if (creating !== 'STAFF') {
    checks.push(
      prisma.staff
        .findUnique({ where: { email } })
        .then((r) => ({ type: 'STAFF' as const, found: r !== null })),
    );
  }
  if (creating !== 'GUARDIAN') {
    checks.push(
      prisma.guardian
        .findUnique({ where: { email } })
        .then((r) => ({ type: 'GUARDIAN' as const, found: r !== null })),
    );
  }
  if (creating !== 'STUDENT') {
    checks.push(
      prisma.student
        .findUnique({ where: { email } })
        .then((r) => ({ type: 'STUDENT' as const, found: r !== null })),
    );
  }

  const results = await Promise.all(checks);
  const collision = results.find((r) => r.found);
  if (collision) {
    throw new ConflictException(
      `This email is already used by a ${LABELS[collision.type]} account`,
    );
  }
}
