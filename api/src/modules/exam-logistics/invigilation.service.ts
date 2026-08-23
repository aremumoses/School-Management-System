import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BroadcastsService } from '../communication/broadcasts.service';
import { AssignInvigilatorDto } from './dto/exam-logistics.dto';

export interface RosterSessionDto {
  examSessionId: string;
  subjectName: string;
  armLabel: string;
  date: Date;
  startTime: string;
  durationMinutes: number;
  invigilators: {
    staffId: string;
    staffName: string;
    role: 'LEAD' | 'ASSISTANT';
  }[];
}

@Injectable()
export class InvigilationService {
  private readonly logger = new Logger(InvigilationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcasts: BroadcastsService,
  ) {}

  async assign(examSessionId: string, dto: AssignInvigilatorDto) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: examSessionId },
      include: { subject: true, arm: { include: { class: true } } },
    });
    if (!session) throw new NotFoundException('Exam session not found');
    const staff = await this.prisma.staff.findUnique({
      where: { id: dto.staffId },
    });
    if (!staff) throw new NotFoundException('Staff member not found');

    const duty = await this.prisma.invigilationDuty.upsert({
      where: {
        examSessionId_staffId: { examSessionId, staffId: dto.staffId },
      },
      update: { role: dto.role },
      create: { examSessionId, staffId: dto.staffId, role: dto.role },
    });

    const armLabel = `${session.arm.class.name} ${session.arm.name}`;
    this.broadcasts
      .sendStaffNotice({
        staffIds: [dto.staffId],
        templateKey: 'INVIGILATION_DUTY',
        context: {
          role: dto.role === 'LEAD' ? 'Lead' : 'Assistant',
          subject_name: session.subject.name,
          arm_label: armLabel,
          date: session.date.toISOString().slice(0, 10),
          start_time: session.startTime,
        },
        emailSubject: `Invigilation duty — ${session.subject.name} (${armLabel})`,
        targetId: session.id,
      })
      .catch((error: unknown) =>
        this.logger.error(
          'INVIGILATION_DUTY notice failed',
          error instanceof Error ? error.stack : String(error),
        ),
      );

    return duty;
  }

  async remove(examSessionId: string, staffId: string): Promise<void> {
    await this.prisma.invigilationDuty.delete({
      where: { examSessionId_staffId: { examSessionId, staffId } },
    });
  }

  async listForSession(examSessionId: string) {
    return this.prisma.invigilationDuty.findMany({
      where: { examSessionId },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Every exam session in the term with its assigned invigilators, so the
   * roster UI can both display the schedule and compute each staff
   * member's duty load client-side (count of sessions they appear in) —
   * no need for a second per-staff endpoint.
   */
  async roster(termId: string): Promise<RosterSessionDto[]> {
    const sessions = await this.prisma.examSession.findMany({
      where: { termId },
      include: {
        subject: true,
        arm: { include: { class: true } },
        invigilationDuties: {
          include: {
            staff: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return sessions.map((s) => ({
      examSessionId: s.id,
      subjectName: s.subject.name,
      armLabel: `${s.arm.class.name} ${s.arm.name}`,
      date: s.date,
      startTime: s.startTime,
      durationMinutes: s.durationMinutes,
      invigilators: s.invigilationDuties.map((d) => ({
        staffId: d.staffId,
        staffName: `${d.staff.firstName} ${d.staff.lastName}`,
        role: d.role,
      })),
    }));
  }
}
