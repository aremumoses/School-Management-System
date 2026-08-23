import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Expense, Prisma } from '@prisma/client';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import type { RequestUser } from '../../common/types/auth.types';
import type {
  CreateExpenseDto,
  QueryExpensesDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

/**
 * docs/15-module-fees-payments.md §7 — the non-fee expenditure ledger.
 * Every mutation is audit-logged (docs §10 "all financial actions"), and
 * deletion is a void (voidedAt set), never a hard delete — same convention
 * as Payment ("a mistaken entry is corrected, not erased").
 */
@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateExpenseDto, user: RequestUser): Promise<Expense> {
    const expense = await this.prisma.expense.create({
      data: {
        category: dto.category,
        amount: dto.amount,
        date: new Date(dto.date),
        description: dto.description,
        recordedByStaffId: user.id,
      },
      include: { recordedBy: { select: { firstName: true, lastName: true } } },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'EXPENSE_RECORDED',
      entityType: 'Expense',
      entityId: expense.id,
      afterJson: {
        category: expense.category,
        amount: expense.amount,
        date: expense.date,
        description: expense.description,
      },
    });

    return expense;
  }

  async list(query: QueryExpensesDto) {
    const where: Prisma.ExpenseWhereInput = {
      voidedAt: null,
      ...(query.category ? { category: query.category } : {}),
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [data, totals] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        include: {
          recordedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    return { data, totalAmount: totals._sum.amount ?? 0 };
  }

  async getOrThrow(id: string): Promise<Expense> {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: { recordedBy: { select: { firstName: true, lastName: true } } },
    });
    if (!expense || expense.voidedAt) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async update(
    id: string,
    dto: UpdateExpenseDto,
    user: RequestUser,
  ): Promise<Expense> {
    const before = await this.getOrThrow(id);

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
      },
      include: { recordedBy: { select: { firstName: true, lastName: true } } },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'EXPENSE_UPDATED',
      entityType: 'Expense',
      entityId: id,
      beforeJson: {
        category: before.category,
        amount: before.amount,
        date: before.date,
        description: before.description,
      },
      afterJson: {
        category: updated.category,
        amount: updated.amount,
        date: updated.date,
        description: updated.description,
      },
    });

    return updated;
  }

  /** Void, not delete — the row stays for reconciliation; list() excludes it. */
  async void(id: string, user: RequestUser): Promise<void> {
    const before = await this.getOrThrow(id);

    await this.prisma.expense.update({
      where: { id },
      data: { voidedAt: new Date() },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'EXPENSE_VOIDED',
      entityType: 'Expense',
      entityId: id,
      beforeJson: {
        category: before.category,
        amount: before.amount,
        date: before.date,
        description: before.description,
      },
    });
  }

  async uploadReceipt(
    id: string,
    file: Express.Multer.File | undefined,
    user: RequestUser,
  ): Promise<Expense> {
    if (!file) throw new BadRequestException('No file uploaded');
    await this.getOrThrow(id);

    const { url } = await this.storage.upload(
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      },
      'expense-receipts',
    );

    const updated = await this.prisma.expense.update({
      where: { id },
      data: { receiptUrl: url },
      include: { recordedBy: { select: { firstName: true, lastName: true } } },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'EXPENSE_RECEIPT_ATTACHED',
      entityType: 'Expense',
      entityId: id,
      afterJson: { receiptUrl: url },
    });

    return updated;
  }
}
