import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';

export interface CandidateArm {
  classTeacherId: string | null;
  classId: string;
}

// docs/03-roles-and-permissions.md §2 "Communication/broadcast" row gives
// these roles their own topic-scoped qualifier ("own dept", "exam
// notices", "fee notices", ...), but none of them maps to a real data
// model in this codebase (no Department entity, no notice-category gate
// on MessageTemplate) — same situation as HOD's "own dept" qualifier on
// Student records (see students.service.ts's UNSCOPED_VIEW_ROLES comment),
// so they're treated as unscoped for now, same as ADMIN/VICE_PRINCIPAL.
// Only CLASS_TEACHER/SUBJECT_TEACHER have a real, checkable scope (their
// own class) and are genuinely restricted by assertOwnClassScope below.
const UNSCOPED_ROLES: RequestUser['roles'] = [
  'ADMIN',
  'VICE_PRINCIPAL',
  'HOD',
  'EXAM_OFFICER',
  'BURSAR',
  'LIBRARIAN',
  'HOSTEL_WARDEN',
  'TRANSPORT_OFFICER',
  'HR_OFFICER',
  'FRONT_DESK',
];

/**
 * Shared "is this within my own class?" check used by both
 * BroadcastsService (CLASS/INDIVIDUAL targeting) and ConversationsService
 * (starting a thread about a specific ward) — same docs §3 rule ("a
 * Subject Teacher can only target their own class/subject"), same
 * underlying data (Arm.classTeacherId / TeacherAssignment), so it's
 * defined once rather than risking the two copies drifting apart.
 */
@Injectable()
export class ClassScopeService {
  constructor(private readonly prisma: PrismaService) {}

  isUnscoped(user: RequestUser): boolean {
    return user.roles.some((role) => UNSCOPED_ROLES.includes(role));
  }

  /**
   * `candidateArms` is every arm a target could plausibly belong to (one
   * for a CLASS/STUDENT target, several for a GUARDIAN with more than one
   * ward) — passes if ANY of them is in scope.
   */
  async assertOwnClassScope(
    candidateArms: CandidateArm[],
    user: RequestUser,
  ): Promise<void> {
    if (candidateArms.length > 0 && user.roles.includes('CLASS_TEACHER')) {
      if (candidateArms.some((arm) => arm.classTeacherId === user.id)) return;
    }
    if (candidateArms.length > 0 && user.roles.includes('SUBJECT_TEACHER')) {
      const classIds = await this.currentlyTaughtClassIds(user.id);
      if (candidateArms.some((arm) => classIds.includes(arm.classId))) return;
    }
    throw new ForbiddenException('You can only act within your own class.');
  }

  /**
   * Every arm id a CLASS_TEACHER/SUBJECT_TEACHER currently has "own class"
   * access to — for building a *list* query's `where` clause (e.g.
   * IncidentsService scoping `GET /incidents` to a teacher's own
   * students), as opposed to `assertOwnClassScope`'s single-target check.
   * Empty for any other role (callers should treat that as "no scope",
   * not "every arm").
   */
  async ownArmIds(user: RequestUser): Promise<string[]> {
    const armIds = new Set<string>();

    if (user.roles.includes('CLASS_TEACHER')) {
      const arms = await this.prisma.arm.findMany({
        where: { classTeacherId: user.id },
        select: { id: true },
      });
      arms.forEach((a) => armIds.add(a.id));
    }

    if (user.roles.includes('SUBJECT_TEACHER')) {
      const classIds = await this.currentlyTaughtClassIds(user.id);
      if (classIds.length > 0) {
        const arms = await this.prisma.arm.findMany({
          where: { classId: { in: classIds } },
          select: { id: true },
        });
        arms.forEach((a) => armIds.add(a.id));
      }
    }

    return [...armIds];
  }

  private async currentlyTaughtClassIds(staffId: string): Promise<string[]> {
    const currentTerm = await this.prisma.term.findFirst({
      where: { isCurrent: true },
    });
    if (!currentTerm) return [];
    const assignments = await this.prisma.teacherAssignment.findMany({
      where: { staffId, termId: currentTerm.id },
      select: { classSubject: { select: { classId: true } } },
    });
    return [...new Set(assignments.map((a) => a.classSubject.classId))];
  }
}
