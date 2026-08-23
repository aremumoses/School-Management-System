import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DisciplinaryAction, Incident, Prisma } from '@prisma/client';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { translatePrismaError } from '../../common/utils/prisma-error';
import type { AppRole, RequestUser } from '../../common/types/auth.types';
import { ClassScopeService } from '../communication/class-scope.service';
import { BroadcastsService } from '../communication/broadcasts.service';
import {
  ApproveActionDto,
  CreateIncidentDto,
  ProposeActionDto,
  QueryIncidentsDto,
  RejectActionDto,
  UpdateIncidentDto,
} from './dto/incident.dto';

type IncidentWithActions = Incident & { actions: DisciplinaryAction[] };

// docs/03-roles-and-permissions.md §2 "Discipline" row. HOD's "own dept"
// and HOSTEL_WARDEN's "boarders" qualifiers have no backing Department/
// boarder model in this codebase yet — same situation as every other
// stage's identical gap (see ClassScopeService's UNSCOPED_ROLES comment),
// so they're treated as unscoped here too. EXAM_OFFICER/FRONT_DESK are
// plain "V" with no qualifier at all. BURSAR/LIBRARIAN/TRANSPORT_OFFICER/
// HR_OFFICER get "–" (no access) per the matrix and are deliberately
// absent from this list.
const UNSCOPED_VIEW_ROLES: AppRole[] = [
  'ADMIN',
  'VICE_PRINCIPAL',
  'HOD',
  'EXAM_OFFICER',
  'HOSTEL_WARDEN',
  'FRONT_DESK',
];

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly classScope: ClassScopeService,
    private readonly broadcastsService: BroadcastsService,
  ) {}

  async create(dto: CreateIncidentDto, user: RequestUser): Promise<Incident> {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      include: {
        enrollments: { where: { status: 'ACTIVE' }, include: { arm: true } },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    if (!this.isUnscoped(user)) {
      await this.classScope.assertOwnClassScope(
        student.enrollments.map((e) => e.arm),
        user,
      );
    }

    const incident = await this.prisma.incident.create({
      data: {
        studentId: dto.studentId,
        reportedByStaffId: user.id,
        description: dto.description,
        severity: dto.severity,
        date: new Date(dto.date),
      },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'INCIDENT_LOGGED',
      entityType: 'Incident',
      entityId: incident.id,
      afterJson: { studentId: incident.studentId, severity: incident.severity },
    });

    return incident;
  }

  async update(
    id: string,
    dto: UpdateIncidentDto,
    user: RequestUser,
  ): Promise<Incident> {
    const existing = await this.getRawOrThrow(id);
    this.assertCanEdit(existing, user);

    let updated: Incident;
    try {
      updated = await this.prisma.incident.update({
        where: { id },
        data: { description: dto.description, severity: dto.severity },
      });
    } catch (error) {
      return translatePrismaError(error, 'Incident not found');
    }

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'INCIDENT_UPDATED',
      entityType: 'Incident',
      entityId: id,
      beforeJson: {
        description: existing.description,
        severity: existing.severity,
      },
      afterJson: {
        description: updated.description,
        severity: updated.severity,
      },
    });

    return updated;
  }

  async list(
    query: QueryIncidentsDto,
    user: RequestUser,
  ): Promise<IncidentWithActions[]> {
    const where = await this.buildScopedWhere(query, user);
    if (where === 'NONE') return [];
    return this.prisma.incident.findMany({
      where,
      include: { actions: { orderBy: { createdAt: 'asc' } } },
      orderBy: { date: 'desc' },
    });
  }

  async getOrThrow(
    id: string,
    user: RequestUser,
  ): Promise<IncidentWithActions> {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: { actions: { orderBy: { createdAt: 'asc' } } },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    await this.assertCanView(incident, user);
    return incident;
  }

  /**
   * docs prompt §1 — a Class Teacher (or other E-role) can propose any of
   * the three action types, but only WARNING is final immediately
   * (status=APPROVED at creation, no human "decided" the WARNING — see
   * DisciplinaryAction's schema comment). SUSPENSION/EXPULSION stay
   * PROPOSED until an ADMIN explicitly approves them via approveAction.
   */
  async proposeAction(
    incidentId: string,
    dto: ProposeActionDto,
    user: RequestUser,
  ): Promise<DisciplinaryAction> {
    const incident = await this.getRawOrThrow(incidentId);
    if (!this.isUnscoped(user)) {
      const student = await this.prisma.student.findUniqueOrThrow({
        where: { id: incident.studentId },
        include: {
          enrollments: { where: { status: 'ACTIVE' }, include: { arm: true } },
        },
      });
      await this.classScope.assertOwnClassScope(
        student.enrollments.map((e) => e.arm),
        user,
      );
    }

    const isAutoApproved = dto.actionType === 'WARNING';
    const action = await this.prisma.disciplinaryAction.create({
      data: {
        incidentId,
        actionType: dto.actionType,
        proposedByStaffId: user.id,
        status: isAutoApproved ? 'APPROVED' : 'PROPOSED',
      },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'DISCIPLINARY_ACTION_PROPOSED',
      entityType: 'DisciplinaryAction',
      entityId: action.id,
      afterJson: {
        incidentId,
        actionType: dto.actionType,
        status: action.status,
      },
    });

    if (isAutoApproved) {
      await this.notifyGuardians(incident.studentId, action);
    }

    return action;
  }

  async approveAction(
    incidentId: string,
    actionId: string,
    dto: ApproveActionDto,
    user: RequestUser,
  ): Promise<DisciplinaryAction> {
    const action = await this.getProposedActionOrThrow(incidentId, actionId);

    const updated = await this.prisma.disciplinaryAction.update({
      where: { id: actionId },
      data: {
        status: 'APPROVED',
        decidedByStaffId: user.id,
        decidedAt: new Date(),
        decisionNotes: dto.decisionNotes,
      },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'DISCIPLINARY_ACTION_APPROVED',
      entityType: 'DisciplinaryAction',
      entityId: actionId,
      afterJson: { actionType: updated.actionType },
    });

    await this.notifyGuardians(action.incident.studentId, updated);

    return updated;
  }

  async rejectAction(
    incidentId: string,
    actionId: string,
    dto: RejectActionDto,
    user: RequestUser,
  ): Promise<DisciplinaryAction> {
    // Called for its lookup/validation (exists, belongs to this incident,
    // still PROPOSED) — the result itself isn't needed since a rejection
    // never notifies anyone.
    await this.getProposedActionOrThrow(incidentId, actionId);

    const updated = await this.prisma.disciplinaryAction.update({
      where: { id: actionId },
      data: {
        status: 'REJECTED',
        decidedByStaffId: user.id,
        decidedAt: new Date(),
        decisionNotes: dto.decisionNotes,
      },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'DISCIPLINARY_ACTION_REJECTED',
      entityType: 'DisciplinaryAction',
      entityId: actionId,
      afterJson: {
        actionType: updated.actionType,
        decisionNotes: dto.decisionNotes,
      },
    });

    // No guardian notification — a rejected proposal never took effect.
    return updated;
  }

  // -------------------------------------------------------------------

  private async getProposedActionOrThrow(
    incidentId: string,
    actionId: string,
  ): Promise<DisciplinaryAction & { incident: Incident }> {
    const action = await this.prisma.disciplinaryAction.findUnique({
      where: { id: actionId },
      include: { incident: true },
    });
    if (!action || action.incidentId !== incidentId) {
      throw new NotFoundException('Disciplinary action not found');
    }
    if (action.status !== 'PROPOSED') {
      throw new ForbiddenException('This action has already been decided.');
    }
    return action;
  }

  private async notifyGuardians(
    studentId: string,
    action: DisciplinaryAction,
  ): Promise<void> {
    await this.broadcastsService.sendDisciplineAlert({
      studentId,
      actionType: action.actionType,
    });
  }

  private async getRawOrThrow(id: string): Promise<Incident> {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  private isUnscoped(user: RequestUser): boolean {
    return user.roles.some((role) => UNSCOPED_VIEW_ROLES.includes(role));
  }

  /** Only the original reporter (or an unscoped role) may edit an incident's content — not just anyone with create access. */
  private assertCanEdit(incident: Incident, user: RequestUser): void {
    if (this.isUnscoped(user)) return;
    if (incident.reportedByStaffId === user.id) return;
    throw new ForbiddenException('You can only edit incidents you reported.');
  }

  private async assertCanView(
    incident: Incident,
    user: RequestUser,
  ): Promise<void> {
    if (user.roles.includes('STUDENT')) {
      if (user.id !== incident.studentId) {
        throw new ForbiddenException('You can only view your own incidents');
      }
      return;
    }
    if (user.roles.includes('PARENT')) {
      const link = await this.prisma.studentGuardian.findFirst({
        where: { studentId: incident.studentId, guardianId: user.id },
      });
      if (!link) {
        throw new ForbiddenException(
          "You can only view your own ward's incidents",
        );
      }
      return;
    }
    if (this.isUnscoped(user)) return;
    if (
      user.roles.includes('CLASS_TEACHER') ||
      user.roles.includes('SUBJECT_TEACHER')
    ) {
      const armIds = await this.classScope.ownArmIds(user);
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId: incident.studentId,
          armId: { in: armIds },
          status: 'ACTIVE',
        },
      });
      if (enrollment) return;
    }
    throw new ForbiddenException('You do not have access to this incident');
  }

  private async buildScopedWhere(
    query: QueryIncidentsDto,
    user: RequestUser,
  ): Promise<Prisma.IncidentWhereInput | 'NONE'> {
    if (user.roles.includes('STUDENT')) {
      return { studentId: user.id };
    }
    if (user.roles.includes('PARENT')) {
      const links = await this.prisma.studentGuardian.findMany({
        where: { guardianId: user.id },
      });
      const wardIds = links.map((l) => l.studentId);
      if (wardIds.length === 0) return 'NONE';
      if (query.studentId && !wardIds.includes(query.studentId)) {
        throw new ForbiddenException(
          "You can only view your own ward's incidents",
        );
      }
      return { studentId: query.studentId ?? { in: wardIds } };
    }
    if (this.isUnscoped(user)) {
      return { studentId: query.studentId };
    }
    if (
      user.roles.includes('CLASS_TEACHER') ||
      user.roles.includes('SUBJECT_TEACHER')
    ) {
      const armIds = await this.classScope.ownArmIds(user);
      if (armIds.length === 0) return 'NONE';
      return {
        studentId: query.studentId,
        student: {
          enrollments: { some: { armId: { in: armIds }, status: 'ACTIVE' } },
        },
      };
    }
    // BURSAR/LIBRARIAN/TRANSPORT_OFFICER/HR_OFFICER (and any other
    // combination that resolved to nothing above) — fail closed, matching
    // the matrix's "–".
    return 'NONE';
  }
}
