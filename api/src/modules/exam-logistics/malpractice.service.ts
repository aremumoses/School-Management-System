import { Injectable, NotFoundException } from '@nestjs/common';
import type { RequestUser } from '../../common/types/auth.types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMalpracticeIncidentDto } from './dto/exam-logistics.dto';

const INCIDENT_INCLUDE = {
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNumber: true,
    },
  },
  loggedByStaff: { select: { id: true, firstName: true, lastName: true } },
  examSession: {
    include: { subject: true, arm: { include: { class: true } } },
  },
} as const;

@Injectable()
export class MalpracticeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMalpracticeIncidentDto, user: RequestUser) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    if (dto.examSessionId) {
      const session = await this.prisma.examSession.findUnique({
        where: { id: dto.examSessionId },
      });
      if (!session) throw new NotFoundException('Exam session not found');
    }
    if (dto.cbtAttemptId) {
      const attempt = await this.prisma.cBTAttempt.findUnique({
        where: { id: dto.cbtAttemptId },
      });
      if (!attempt) throw new NotFoundException('CBT attempt not found');
    }

    return this.prisma.malpracticeIncident.create({
      data: {
        examSessionId: dto.examSessionId ?? null,
        cbtAttemptId: dto.cbtAttemptId ?? null,
        studentId: dto.studentId,
        description: dto.description,
        actionTaken: dto.actionTaken,
        loggedByStaffId: user.id,
      },
      include: INCIDENT_INCLUDE,
    });
  }

  list() {
    return this.prisma.malpracticeIncident.findMany({
      include: INCIDENT_INCLUDE,
      orderBy: { loggedAt: 'desc' },
    });
  }
}
