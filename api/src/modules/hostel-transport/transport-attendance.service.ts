import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { BroadcastsService } from '../communication/broadcasts.service';
import { MarkTransportAttendanceDto } from './dto/transport.dto';

export interface TransportAttendanceEntryDto {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  stopName: string;
  boarded: boolean;
}

export interface TransportAttendanceDto {
  id: string | null;
  routeId: string;
  routeName: string;
  date: string;
  run: 'PICKUP' | 'DROPOFF';
  entries: TransportAttendanceEntryDto[];
}

export interface ReconciliationRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  routeName: string;
}

@Injectable()
export class TransportAttendanceService {
  private readonly logger = new Logger(TransportAttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcasts: BroadcastsService,
  ) {}

  async getAttendance(
    routeId: string,
    date: string,
    run: 'PICKUP' | 'DROPOFF',
  ): Promise<TransportAttendanceDto> {
    const route = await this.prisma.transportRoute.findUnique({
      where: { id: routeId },
    });
    if (!route) throw new NotFoundException('Route not found');

    const assignments = await this.prisma.studentRouteAssignment.findMany({
      where: { routeId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        stop: true,
      },
      orderBy: { stop: { order: 'asc' } },
    });

    const existing = await this.prisma.transportAttendance.findUnique({
      where: { routeId_date_run: { routeId, date: new Date(date), run } },
      include: { entries: true },
    });
    const entryByStudent = new Map(
      existing?.entries.map((e) => [e.studentId, e]) ?? [],
    );

    const entries: TransportAttendanceEntryDto[] = assignments.map((a) => ({
      studentId: a.studentId,
      firstName: a.student.firstName,
      lastName: a.student.lastName,
      admissionNumber: a.student.admissionNumber,
      stopName: a.stop.stopName,
      boarded: entryByStudent.get(a.studentId)?.boarded ?? true,
    }));

    return {
      id: existing?.id ?? null,
      routeId,
      routeName: route.name,
      date,
      run,
      entries,
    };
  }

  async mark(
    dto: MarkTransportAttendanceDto,
    user: RequestUser,
  ): Promise<TransportAttendanceDto> {
    const route = await this.prisma.transportRoute.findUnique({
      where: { id: dto.routeId },
    });
    if (!route) throw new NotFoundException('Route not found');

    const assignments = await this.prisma.studentRouteAssignment.findMany({
      where: { routeId: dto.routeId },
      select: { studentId: true },
    });
    const assignedIds = new Set(assignments.map((a) => a.studentId));

    const entries =
      dto.entries && dto.entries.length > 0
        ? dto.entries
        : [...assignedIds].map((studentId) => ({ studentId, boarded: true }));

    const unknown = entries.filter((e) => !assignedIds.has(e.studentId));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `These students are not assigned to this route: ${unknown.map((e) => e.studentId).join(', ')}`,
      );
    }

    const date = new Date(dto.date);
    const attendance = await this.prisma.transportAttendance.upsert({
      where: { routeId_date_run: { routeId: dto.routeId, date, run: dto.run } },
      update: {},
      create: {
        routeId: dto.routeId,
        date,
        run: dto.run,
        markedByStaffId: user.id,
      },
    });

    await this.prisma.$transaction(
      entries.map((entry) =>
        this.prisma.transportAttendanceEntry.upsert({
          where: {
            attendanceId_studentId: {
              attendanceId: attendance.id,
              studentId: entry.studentId,
            },
          },
          update: { boarded: entry.boarded, timestamp: new Date() },
          create: {
            attendanceId: attendance.id,
            studentId: entry.studentId,
            boarded: entry.boarded,
          },
        }),
      ),
    );
    await this.prisma.transportAttendance.update({
      where: { id: attendance.id },
      data: { markedByStaffId: user.id },
    });

    // Only PICKUP no-shows alert a parent — a DROPOFF "no-board" typically
    // means the student simply wasn't going home by bus that day, not a
    // safety concern the way a missed morning pickup is.
    if (dto.run === 'PICKUP') {
      for (const entry of entries) {
        if (!entry.boarded) {
          this.broadcasts
            .sendTransportNoShowAlert({
              studentId: entry.studentId,
              routeName: route.name,
              date: dto.date,
            })
            .catch((error: unknown) =>
              this.logger.error(
                'TRANSPORT_NO_SHOW notice failed',
                error instanceof Error ? error.stack : String(error),
              ),
            );
        }
      }
    }

    return this.getAttendance(dto.routeId, dto.date, dto.run);
  }

  /**
   * "Present at school but never boarded" — cross-references the day's
   * PICKUP no-shows against Stage 4's classroom Attendance (whole-day rows,
   * classSubjectId null) for the same date, per the spec's reconciliation
   * report.
   */
  async getReconciliation(date: string): Promise<ReconciliationRow[]> {
    const dateObj = new Date(date);
    const pickupAttendances = await this.prisma.transportAttendance.findMany({
      where: { date: dateObj, run: 'PICKUP' },
      include: {
        route: true,
        entries: { where: { boarded: false } },
      },
    });

    const noShowStudentIds = pickupAttendances.flatMap((a) =>
      a.entries.map((e) => ({
        studentId: e.studentId,
        routeName: a.route.name,
      })),
    );
    if (noShowStudentIds.length === 0) return [];

    const presentInClass = await this.prisma.attendance.findMany({
      where: {
        studentId: { in: noShowStudentIds.map((n) => n.studentId) },
        date: dateObj,
        classSubjectId: null,
        status: { in: ['PRESENT', 'LATE'] },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
    });
    const routeNameByStudent = new Map(
      noShowStudentIds.map((n) => [n.studentId, n.routeName]),
    );

    return presentInClass.map((a) => ({
      studentId: a.student.id,
      firstName: a.student.firstName,
      lastName: a.student.lastName,
      admissionNumber: a.student.admissionNumber,
      routeName: routeNameByStudent.get(a.student.id) ?? '',
    }));
  }
}
