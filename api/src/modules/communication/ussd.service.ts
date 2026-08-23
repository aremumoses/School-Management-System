import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { SetUssdPinDto, UssdRequestDto } from './dto/ussd.dto';

const BCRYPT_ROUNDS = 10;

/**
 * USSD fallback (docs/16-module-communication.md §8, Stage 28 — Phase 3,
 * the most skippable piece of this stage). Modeled on Africa's Talking's
 * stateless menu protocol: the entire session's state is reconstructed
 * from `text`'s star-separated trail on every request — there is no
 * server-side session store, exactly per the aggregator's own design
 * (a genuine USSD gateway holds the session, not the app behind it).
 *
 * Menu depth is uniform regardless of how many wards a guardian has, to
 * keep the state machine simple: PIN -> ward picker (even for a single
 * ward) -> 3-option menu -> result. No new business logic per option —
 * each one re-derives the same figures the in-app dashboards already show,
 * directly from Prisma (not through the JWT-guarded service methods those
 * dashboards use, since a USSD session has no JWT — phone+PIN *is* the
 * authentication here).
 */
@Injectable()
export class UssdService {
  private readonly logger = new Logger(UssdService.name);

  constructor(private readonly prisma: PrismaService) {}

  async setPin(
    dto: SetUssdPinDto,
    user: RequestUser,
  ): Promise<{ success: true }> {
    if (!/^\d{4}$/.test(dto.pin)) {
      throw new Error('PIN must be exactly 4 digits');
    }
    const ussdPin = await bcrypt.hash(dto.pin, BCRYPT_ROUNDS);
    await this.prisma.guardian.update({
      where: { id: user.id },
      data: { ussdPin },
    });
    return { success: true };
  }

  async handle(dto: UssdRequestDto): Promise<string> {
    const segments = dto.text ? dto.text.split('*') : [];

    if (segments.length === 0) {
      return 'CON Welcome to the School Portal\nEnter your 4-digit PIN to continue:';
    }

    const guardian = await this.findGuardianByPhone(dto.phoneNumber);
    if (!guardian || !guardian.ussdPin) {
      return 'END No USSD-enabled account found for this phone number. Set a PIN from your parent portal first.';
    }

    const pin = segments[0];
    const pinValid = await bcrypt.compare(pin, guardian.ussdPin);
    if (!pinValid) {
      this.logger.warn(
        `USSD: incorrect PIN attempt for guardian ${guardian.id}`,
      );
      return 'END Incorrect PIN.';
    }

    const links = await this.prisma.studentGuardian.findMany({
      where: { guardianId: guardian.id },
      include: { student: true },
      orderBy: { student: { firstName: 'asc' } },
    });
    if (links.length === 0) {
      return 'END No students are linked to this account.';
    }

    if (segments.length === 1) {
      const options = links
        .map((l, i) => `${i + 1}. ${l.student.firstName} ${l.student.lastName}`)
        .join('\n');
      return `CON Select a ward:\n${options}`;
    }

    const wardIndex = Number(segments[1]) - 1;
    const ward = links[wardIndex]?.student;
    if (!ward) {
      return 'END Invalid selection.';
    }

    if (segments.length === 2) {
      return `CON ${ward.firstName} ${ward.lastName}\n1. Check attendance\n2. Check fee balance\n3. Check latest result summary`;
    }

    switch (segments[2]) {
      case '1':
        return this.attendanceSummaryText(ward.id);
      case '2':
        return this.feeBalanceText(ward.id);
      case '3':
        return this.latestResultText(ward.id);
      default:
        return 'END Invalid selection.';
    }
  }

  private async attendanceSummaryText(studentId: string): Promise<string> {
    const currentTerm = await this.prisma.term.findFirst({
      where: { isCurrent: true },
    });
    if (!currentTerm) return 'END No current term is configured.';

    const records = await this.prisma.attendance.findMany({
      where: { studentId, termId: currentTerm.id, classSubjectId: null },
      select: { status: true },
    });
    if (records.length === 0) {
      return `END No attendance recorded yet for ${currentTerm.name} Term.`;
    }
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    return `END ${currentTerm.name} Term attendance: ${present} present, ${absent} absent, ${late} late (of ${records.length} days).`;
  }

  private async feeBalanceText(studentId: string): Promise<string> {
    const invoices = await this.prisma.invoice.findMany({
      where: { studentId, status: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
      include: { discounts: true },
    });
    if (invoices.length === 0) {
      return 'END No outstanding fee balance.';
    }
    const totalBalance = invoices.reduce((sum, inv) => {
      const discountTotal = inv.discounts.reduce((s, d) => s + d.amount, 0);
      const netPayable = inv.subtotal - discountTotal;
      return sum + (netPayable - inv.amountPaid);
    }, 0);
    return `END Outstanding fee balance: ${formatNaira(totalBalance)} across ${invoices.length} invoice(s).`;
  }

  private async latestResultText(studentId: string): Promise<string> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, status: 'ACTIVE' },
    });
    if (!enrollment) return 'END No active enrollment found.';

    const publishedStatus = await this.prisma.classTermResultStatus.findFirst({
      where: { armId: enrollment.armId, stage: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      include: { term: true },
    });
    if (!publishedStatus) {
      return 'END No published result available yet.';
    }

    const scores = await this.prisma.score.findMany({
      where: { studentId, termId: publishedStatus.termId },
      include: { assessmentComponent: true },
    });
    if (scores.length === 0) {
      return `END ${publishedStatus.term.name} Term result is published, but no scores are on file.`;
    }

    // Weighted percentage per subject (assessmentComponent.weight is "out
    // of 100 points"), averaged across every subject scored — same
    // subtotal formula results.service.ts's report-card generation uses,
    // computed directly since USSD has no JWT to call that guarded path.
    const bySubject = new Map<string, number>();
    for (const score of scores) {
      const contribution =
        (score.score / score.assessmentComponent.maxScore) *
        score.assessmentComponent.weight;
      bySubject.set(
        score.classSubjectId,
        (bySubject.get(score.classSubjectId) ?? 0) + contribution,
      );
    }
    const average =
      [...bySubject.values()].reduce((sum, v) => sum + v, 0) / bySubject.size;

    return `END ${publishedStatus.term.name} Term result: overall average ${average.toFixed(1)}% across ${bySubject.size} subject(s).`;
  }

  /** Same phone normalization as SmsService/ConversationsService — matches however the number is stored ("+234…"/"0…"/"234…"). */
  private async findGuardianByPhone(rawPhone: string) {
    const digitsOnly = rawPhone.replace(/[^\d]/g, '');
    const local = digitsOnly.startsWith('234')
      ? `0${digitsOnly.slice(3)}`
      : digitsOnly;
    const international = digitsOnly.startsWith('0')
      ? `234${digitsOnly.slice(1)}`
      : digitsOnly;

    return this.prisma.guardian.findFirst({
      where: {
        OR: [
          { phone: rawPhone },
          { phone: digitsOnly },
          { phone: local },
          { phone: `+${international}` },
          { phone: international },
        ],
      },
    });
  }
}

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
