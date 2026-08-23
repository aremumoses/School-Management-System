import { Injectable, NotFoundException } from '@nestjs/common';
import type { AcademicSession, Term } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { translatePrismaError } from '../../../common/utils/prisma-error';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSessions(): Promise<(AcademicSession & { terms: Term[] })[]> {
    return this.prisma.academicSession.findMany({
      include: { terms: { orderBy: { startDate: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSession(id: string): Promise<AcademicSession & { terms: Term[] }> {
    const session = await this.prisma.academicSession.findUnique({
      where: { id },
      include: { terms: { orderBy: { startDate: 'asc' } } },
    });
    if (!session) {
      throw new NotFoundException('Academic session not found');
    }
    return session;
  }

  /** Optionally scaffolds terms atomically with the session — see docs/04-dashboard-school-admin.md §4. */
  async createSession(
    dto: CreateSessionDto,
  ): Promise<AcademicSession & { terms: Term[] }> {
    try {
      return await this.prisma.academicSession.create({
        data: {
          name: dto.name,
          terms: dto.terms
            ? {
                create: dto.terms.map((t) => ({
                  name: t.name,
                  startDate: new Date(t.startDate),
                  endDate: new Date(t.endDate),
                })),
              }
            : undefined,
        },
        include: { terms: true },
      });
    } catch (error) {
      translatePrismaError(
        error,
        'An academic session with this name already exists',
      );
    }
  }

  async addTerm(sessionId: string, dto: CreateTermDto): Promise<Term> {
    await this.getSession(sessionId);
    try {
      return await this.prisma.term.create({
        data: {
          sessionId,
          name: dto.name,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
        },
      });
    } catch (error) {
      translatePrismaError(error, 'This term already exists for this session');
    }
  }

  async updateTerm(termId: string, dto: UpdateTermDto): Promise<Term> {
    await this.getTermOrThrow(termId);
    try {
      return await this.prisma.term.update({
        where: { id: termId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.startDate !== undefined && {
            startDate: new Date(dto.startDate),
          }),
          ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        },
      });
    } catch (error) {
      translatePrismaError(
        error,
        'This term name already exists for this session',
      );
    }
  }

  async deleteTerm(termId: string): Promise<void> {
    await this.getTermOrThrow(termId);
    try {
      await this.prisma.term.delete({ where: { id: termId } });
    } catch (error) {
      translatePrismaError(
        error,
        'Cannot delete a term that already has enrollments or other linked records',
      );
    }
  }

  /** Exactly one Term is current at a time — unset all others first, in one transaction. */
  async setCurrentTerm(termId: string): Promise<Term> {
    const term = await this.getTermOrThrow(termId);
    return this.prisma.$transaction(async (tx) => {
      await tx.term.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
      return tx.term.update({
        where: { id: term.id },
        data: { isCurrent: true },
      });
    });
  }

  async getCurrentTerm(): Promise<Term & { session: AcademicSession }> {
    const term = await this.prisma.term.findFirst({
      where: { isCurrent: true },
      include: { session: true },
    });
    if (!term) {
      throw new NotFoundException('No current term has been set yet');
    }
    return term;
  }

  private async getTermOrThrow(termId: string): Promise<Term> {
    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) {
      throw new NotFoundException('Term not found');
    }
    return term;
  }
}
