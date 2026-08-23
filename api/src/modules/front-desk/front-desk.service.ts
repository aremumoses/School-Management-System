import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { BroadcastsService } from '../communication/broadcasts.service';
import {
  AddPickupPersonDto,
  CreatePickupRequestDto,
  IssueGatePassDto,
  LogAssetMovementDto,
  LogFacilityIncidentDto,
  LogLateArrivalDto,
  ResolveGatePassDto,
  SignInVisitorDto,
} from './dto/front-desk.dto';

const STUDENT_SELECT = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    admissionNumber: true,
  },
} as const;

@Injectable()
export class FrontDeskService {
  private readonly logger = new Logger(FrontDeskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcasts: BroadcastsService,
  ) {}

  // -------------------------------------------------------------------
  // Pickup authorization (parent-owned)
  // -------------------------------------------------------------------

  /** Guardian-student link check — same scoping as Documents/Incidents. */
  private async assertOwnWard(
    guardianId: string,
    studentId: string,
  ): Promise<void> {
    const link = await this.prisma.studentGuardian.findUnique({
      where: { studentId_guardianId: { studentId, guardianId } },
    });
    if (!link) {
      throw new ForbiddenException(
        'You can only manage this list for your own child',
      );
    }
  }

  async addPickupPerson(
    studentId: string,
    dto: AddPickupPersonDto,
    user: RequestUser,
  ) {
    await this.assertOwnWard(user.id, studentId);
    return this.prisma.authorizedPickupPerson.create({
      data: {
        studentId,
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        relationship: dto.relationship.trim(),
        addedByGuardianId: user.id,
      },
    });
  }

  async removePickupPerson(
    studentId: string,
    personId: string,
    user: RequestUser,
  ): Promise<void> {
    await this.assertOwnWard(user.id, studentId);
    const person = await this.prisma.authorizedPickupPerson.findUnique({
      where: { id: personId },
    });
    if (!person || person.studentId !== studentId) {
      throw new NotFoundException('Pickup person not found');
    }
    await this.prisma.authorizedPickupPerson.delete({
      where: { id: personId },
    });
  }

  /** Readable by the parent themselves and Front Desk/Admin — no one else. */
  /**
   * Stage 29 digital ID — the whole point of the QR gate-scan: front desk
   * scans the student's ID and instantly sees who's allowed to collect
   * them, without typing a name into a search box mid-conversation with a
   * parent at the gate. `qrToken` is a long random opaque string (see
   * Student.qrToken's schema comment), so this is safe to leave
   * unauthenticated-by-token (the token itself IS the credential) — access
   * is still gated by @Roles on the controller (front desk/admin/hostel
   * warden only), same as every other endpoint in this file.
   */
  async resolveByQrToken(qrToken: string) {
    const student = await this.prisma.student.findUnique({
      where: { qrToken },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
        photoUrl: true,
        isActive: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { arm: true },
        },
      },
    });
    if (!student) {
      throw new NotFoundException('No student matches this QR code');
    }

    const pickupPersons = await this.prisma.authorizedPickupPerson.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        photoUrl: student.photoUrl,
        isActive: student.isActive,
        className: student.enrollments[0]?.arm.name ?? null,
      },
      pickupPersons,
    };
  }

  async listPickupPersons(studentId: string, user: RequestUser) {
    if (user.userType === 'GUARDIAN') {
      await this.assertOwnWard(user.id, studentId);
    } else if (
      !user.roles.includes('FRONT_DESK') &&
      !user.roles.includes('ADMIN') &&
      !user.roles.includes('VICE_PRINCIPAL')
    ) {
      throw new ForbiddenException(
        'Only the parent and front-desk staff can view this list',
      );
    }
    return this.prisma.authorizedPickupPerson.findMany({
      where: { studentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createPickupRequest(
    studentId: string,
    dto: CreatePickupRequestDto,
    user: RequestUser,
  ) {
    await this.assertOwnWard(user.id, studentId);
    return this.prisma.pickupRequest.create({
      data: {
        studentId,
        guardianId: user.id,
        pickupTime: new Date(dto.pickupTime),
        reason: dto.reason.trim(),
      },
    });
  }

  /** The parent's own requests (per ward) / front desk's pending queue. */
  async listPickupRequests(user: RequestUser) {
    if (user.userType === 'GUARDIAN') {
      return this.prisma.pickupRequest.findMany({
        where: { guardianId: user.id },
        orderBy: { pickupTime: 'desc' },
        include: { student: STUDENT_SELECT },
      });
    }
    return this.prisma.pickupRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { pickupTime: 'asc' },
      include: {
        student: STUDENT_SELECT,
        guardian: { select: { firstName: true, lastName: true, phone: true } },
      },
    });
  }

  // -------------------------------------------------------------------
  // Visitors
  // -------------------------------------------------------------------

  signInVisitor(dto: SignInVisitorDto) {
    return this.prisma.visitor.create({
      data: {
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        reason: dto.reason.trim(),
        hostStaffId: dto.hostStaffId || null,
      },
      include: {
        hostStaff: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async signOutVisitor(id: string) {
    const visitor = await this.prisma.visitor.findUnique({ where: { id } });
    if (!visitor) throw new NotFoundException('Visitor not found');
    if (visitor.signedOutAt) {
      throw new BadRequestException('This visitor is already signed out');
    }
    return this.prisma.visitor.update({
      where: { id },
      data: { signedOutAt: new Date() },
      include: {
        hostStaff: { select: { firstName: true, lastName: true } },
      },
    });
  }

  listVisitors(date?: string) {
    const { start, end } = this.dayRange(date);
    return this.prisma.visitor.findMany({
      where: { signedInAt: { gte: start, lt: end } },
      orderBy: { signedInAt: 'desc' },
      include: {
        hostStaff: { select: { firstName: true, lastName: true } },
      },
    });
  }

  // -------------------------------------------------------------------
  // Gate pass
  // -------------------------------------------------------------------

  /**
   * The core verification workflow (docs/13 §2–3): match against the
   * parent-maintained list → ISSUED + Class Teacher notified; no match →
   * ESCALATED + Admins notified, never a silent success or silent block.
   */
  async issueGatePass(dto: IssueGatePassDto, user: RequestUser) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { arm: true },
        },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    let requestedByGuardianId: string | null = null;
    if (dto.pickupRequestId) {
      const request = await this.prisma.pickupRequest.findUnique({
        where: { id: dto.pickupRequestId },
      });
      if (!request || request.studentId !== dto.studentId) {
        throw new BadRequestException(
          'That pickup request does not belong to this student',
        );
      }
      requestedByGuardianId = request.guardianId;
      await this.prisma.pickupRequest.update({
        where: { id: request.id },
        data: { status: 'COMPLETED' },
      });
    }

    // Name match (case-insensitive); phone strengthens but its absence
    // doesn't break a name match — gatekeepers won't always have it.
    const authorized = await this.prisma.authorizedPickupPerson.findMany({
      where: { studentId: dto.studentId },
    });
    const nameNeedle = dto.pickupPersonName.trim().toLowerCase();
    const matched = authorized.some(
      (p) =>
        p.name.trim().toLowerCase() === nameNeedle ||
        (dto.pickupPersonPhone &&
          p.phone.replace(/\s/g, '') ===
            dto.pickupPersonPhone.replace(/\s/g, '')),
    );

    const gatePass = await this.prisma.gatePass.create({
      data: {
        studentId: dto.studentId,
        requestedByGuardianId,
        pickupPersonName: dto.pickupPersonName.trim(),
        pickupPersonPhone: dto.pickupPersonPhone?.trim() || null,
        verifiedAgainstAuthorizedList: matched,
        status: matched ? 'ISSUED' : 'ESCALATED',
        issuedByStaffId: user.id,
      },
      include: { student: STUDENT_SELECT },
    });

    const studentName = `${student.firstName} ${student.lastName}`;
    if (matched) {
      const classTeacherId = student.enrollments[0]?.arm.classTeacherId;
      if (classTeacherId) {
        this.broadcasts
          .sendStaffNotice({
            staffIds: [classTeacherId],
            templateKey: 'EARLY_PICKUP',
            context: {
              student_name: studentName,
              pickup_person: gatePass.pickupPersonName,
              time: new Date().toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
            emailSubject: `Early pickup — ${studentName}`,
            targetId: student.id,
          })
          .catch((error: unknown) =>
            this.logger.error(
              'EARLY_PICKUP notice failed',
              error instanceof Error ? error.stack : String(error),
            ),
          );
      }
    } else {
      const admins = await this.prisma.staffRole.findMany({
        where: { role: { in: ['ADMIN', 'VICE_PRINCIPAL'] } },
        select: { staffId: true },
      });
      this.broadcasts
        .sendStaffNotice({
          staffIds: admins.map((a) => a.staffId),
          templateKey: 'UNRECOGNIZED_PICKUP_PERSON',
          context: {
            student_name: studentName,
            pickup_person: gatePass.pickupPersonName,
          },
          emailSubject: `Escalation: unrecognized pickup — ${studentName}`,
          targetId: student.id,
        })
        .catch((error: unknown) =>
          this.logger.error(
            'UNRECOGNIZED_PICKUP_PERSON notice failed',
            error instanceof Error ? error.stack : String(error),
          ),
        );
    }

    return gatePass;
  }

  async resolveGatePass(id: string, dto: ResolveGatePassDto) {
    const gatePass = await this.prisma.gatePass.findUnique({ where: { id } });
    if (!gatePass) throw new NotFoundException('Gate pass not found');
    if (gatePass.status !== 'ESCALATED') {
      throw new BadRequestException(
        `Only an ESCALATED gate pass can be resolved — this one is ${gatePass.status}`,
      );
    }
    return this.prisma.gatePass.update({
      where: { id },
      data: {
        status: dto.decision === 'CONFIRM' ? 'ISSUED' : 'REJECTED',
        resolvedAt: new Date(),
      },
      include: { student: STUDENT_SELECT },
    });
  }

  listGatePasses(date?: string) {
    const { start, end } = this.dayRange(date);
    return this.prisma.gatePass.findMany({
      where: { issuedAt: { gte: start, lt: end } },
      orderBy: { issuedAt: 'desc' },
      include: {
        student: STUDENT_SELECT,
        issuedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  // -------------------------------------------------------------------
  // Late arrivals
  // -------------------------------------------------------------------

  async logLateArrival(dto: LogLateArrivalDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      include: {
        enrollments: { where: { status: 'ACTIVE' }, include: { arm: true } },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const notify = dto.notifyClassTeacher ?? false;
    const classTeacherId = student.enrollments[0]?.arm.classTeacherId;
    const lateArrival = await this.prisma.lateArrival.create({
      data: {
        studentId: dto.studentId,
        arrivalTime: new Date(dto.arrivalTime),
        notifiedClassTeacher: notify && Boolean(classTeacherId),
      },
      include: { student: STUDENT_SELECT },
    });

    if (notify && classTeacherId) {
      this.broadcasts
        .sendStaffNotice({
          staffIds: [classTeacherId],
          templateKey: 'LATE_ARRIVAL',
          context: {
            student_name: `${student.firstName} ${student.lastName}`,
            time: new Date(dto.arrivalTime).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
          emailSubject: `Late arrival — ${student.firstName} ${student.lastName}`,
          targetId: student.id,
        })
        .catch((error: unknown) =>
          this.logger.error(
            'Late-arrival notice failed',
            error instanceof Error ? error.stack : String(error),
          ),
        );
    }

    return lateArrival;
  }

  listLateArrivals(date?: string) {
    const { start, end } = this.dayRange(date);
    return this.prisma.lateArrival.findMany({
      where: { loggedAt: { gte: start, lt: end } },
      orderBy: { arrivalTime: 'desc' },
      include: { student: STUDENT_SELECT },
    });
  }

  // -------------------------------------------------------------------
  // Facility incidents + asset movements
  // -------------------------------------------------------------------

  logFacilityIncident(dto: LogFacilityIncidentDto, user: RequestUser) {
    return this.prisma.facilityIncident.create({
      data: {
        type: dto.type,
        description: dto.description.trim(),
        partiesInvolved: dto.partiesInvolved?.trim() || null,
        actionTaken: dto.actionTaken?.trim() || null,
        loggedByStaffId: user.id,
      },
      include: { loggedBy: { select: { firstName: true, lastName: true } } },
    });
  }

  listFacilityIncidents() {
    return this.prisma.facilityIncident.findMany({
      orderBy: { loggedAt: 'desc' },
      include: { loggedBy: { select: { firstName: true, lastName: true } } },
    });
  }

  logAssetMovement(dto: LogAssetMovementDto, user: RequestUser) {
    return this.prisma.assetMovement.create({
      data: {
        assetDescription: dto.assetDescription.trim(),
        direction: dto.direction,
        reason: dto.reason?.trim() || null,
        loggedByStaffId: user.id,
      },
      include: { loggedBy: { select: { firstName: true, lastName: true } } },
    });
  }

  listAssetMovements() {
    return this.prisma.assetMovement.findMany({
      orderBy: { loggedAt: 'desc' },
      include: { loggedBy: { select: { firstName: true, lastName: true } } },
    });
  }

  // -------------------------------------------------------------------
  // Overview
  // -------------------------------------------------------------------

  async getOverview(date?: string) {
    const { start, end } = this.dayRange(date);
    const [visitorCount, currentlySignedIn, gatePassesOut, lateArrivalCount] =
      await Promise.all([
        this.prisma.visitor.count({
          where: { signedInAt: { gte: start, lt: end } },
        }),
        this.prisma.visitor.count({
          where: { signedInAt: { gte: start, lt: end }, signedOutAt: null },
        }),
        this.prisma.gatePass.count({
          where: { issuedAt: { gte: start, lt: end }, status: 'ISSUED' },
        }),
        this.prisma.lateArrival.count({
          where: { loggedAt: { gte: start, lt: end } },
        }),
      ]);
    const pendingRequests = await this.prisma.pickupRequest.count({
      where: { status: 'PENDING' },
    });
    const escalatedPasses = await this.prisma.gatePass.count({
      where: { status: 'ESCALATED' },
    });
    return {
      visitorCount,
      currentlySignedIn,
      studentsOutOnGatePass: gatePassesOut,
      lateArrivalCount,
      pendingPickupRequests: pendingRequests,
      escalatedGatePasses: escalatedPasses,
    };
  }

  private dayRange(date?: string): { start: Date; end: Date } {
    const base = date ? new Date(date) : new Date();
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }
}
