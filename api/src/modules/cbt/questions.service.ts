import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Question } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import type { RequestUser } from '../../common/types/auth.types';
import {
  CreateQuestionDto,
  QueryQuestionsDto,
  ReviewQuestionDto,
  UpdateQuestionDto,
} from './dto/cbt.dto';

const QUESTION_INCLUDE = {
  subject: { select: { id: true, name: true } },
  authoredBy: { select: { firstName: true, lastName: true } },
  reviewedBy: { select: { firstName: true, lastName: true } },
} as const;

// Objective types must carry a correct answer; ESSAY must not.
const OBJECTIVE_TYPES = [
  'MCQ_SINGLE',
  'MCQ_MULTIPLE',
  'TRUE_FALSE',
  'FILL_BLANK',
  'MATCHING',
] as const;

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private isReviewer(user: RequestUser): boolean {
    return user.roles.includes('EXAM_OFFICER') || user.roles.includes('ADMIN');
  }

  private validateShape(dto: CreateQuestionDto | UpdateQuestionDto): void {
    const type = dto.type;
    if (!type) return;
    if (
      OBJECTIVE_TYPES.includes(type as (typeof OBJECTIVE_TYPES)[number]) &&
      (dto.correctAnswer === undefined || dto.correctAnswer === null)
    ) {
      throw new BadRequestException(`${type} questions need a correctAnswer`);
    }
    if (
      (type === 'MCQ_SINGLE' || type === 'MCQ_MULTIPLE') &&
      (!Array.isArray(dto.options) || (dto.options as unknown[]).length < 2)
    ) {
      throw new BadRequestException(
        'MCQ questions need an options array with at least two entries',
      );
    }
  }

  async create(dto: CreateQuestionDto, user: RequestUser): Promise<Question> {
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    this.validateShape(dto);

    return this.prisma.question.create({
      data: {
        subjectId: dto.subjectId,
        topic: dto.topic.trim(),
        classLevel: dto.classLevel,
        difficulty: dto.difficulty,
        bloomTag: dto.bloomTag?.trim() || null,
        type: dto.type,
        prompt: dto.prompt,
        options: (dto.options ?? undefined) as Prisma.InputJsonValue,
        correctAnswer: (dto.correctAnswer ??
          undefined) as Prisma.InputJsonValue,
        // Governance default (Lesson Notes precedent): teacher-authored
        // questions await Exam Officer approval; the approvers' own
        // questions enter the bank directly.
        status: this.isReviewer(user) ? 'APPROVED' : 'PENDING',
        authoredByStaffId: user.id,
      },
      include: QUESTION_INCLUDE,
    });
  }

  async update(
    id: string,
    dto: UpdateQuestionDto,
    user: RequestUser,
  ): Promise<Question> {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    if (question.authoredByStaffId !== user.id && !this.isReviewer(user)) {
      throw new ForbiddenException('You can only edit your own questions');
    }
    this.validateShape(dto);

    return this.prisma.question.update({
      where: { id },
      data: {
        ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
        ...(dto.topic !== undefined && { topic: dto.topic.trim() }),
        ...(dto.classLevel !== undefined && { classLevel: dto.classLevel }),
        ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
        ...(dto.bloomTag !== undefined && { bloomTag: dto.bloomTag }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.prompt !== undefined && { prompt: dto.prompt }),
        ...(dto.options !== undefined && {
          options: dto.options as Prisma.InputJsonValue,
        }),
        ...(dto.correctAnswer !== undefined && {
          correctAnswer: dto.correctAnswer as Prisma.InputJsonValue,
        }),
        // A teacher editing a RETURNED question resubmits it (lesson-note
        // cycle); reviewer edits never demote an APPROVED question.
        ...(question.status === 'RETURNED' && !this.isReviewer(user)
          ? {
              status: 'PENDING' as const,
              reviewerNotes: null,
              reviewedByStaffId: null,
            }
          : {}),
      },
      include: QUESTION_INCLUDE,
    });
  }

  async review(
    id: string,
    dto: ReviewQuestionDto,
    user: RequestUser,
  ): Promise<Question> {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    if (question.status !== 'PENDING') {
      throw new BadRequestException(
        `Only a PENDING question can be reviewed — this one is ${question.status}`,
      );
    }
    if (dto.decision === 'RETURNED' && !dto.notes?.trim()) {
      throw new BadRequestException('Notes are required when returning');
    }

    return this.prisma.question.update({
      where: { id },
      data: {
        status: dto.decision,
        reviewerNotes: dto.notes?.trim() || null,
        reviewedByStaffId: user.id,
      },
      include: QUESTION_INCLUDE,
    });
  }

  /** Teachers see their own + everything APPROVED (the shared bank); reviewers see all. */
  list(query: QueryQuestionsDto, user: RequestUser) {
    const filters: Prisma.QuestionWhereInput = {
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.topic
        ? { topic: { contains: query.topic, mode: 'insensitive' } }
        : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const scope: Prisma.QuestionWhereInput = this.isReviewer(user)
      ? {}
      : { OR: [{ authoredByStaffId: user.id }, { status: 'APPROVED' }] };

    return this.prisma.question.findMany({
      where: { AND: [scope, filters] },
      orderBy: { createdAt: 'desc' },
      include: QUESTION_INCLUDE,
    });
  }

  async uploadImage(
    id: string,
    file: Express.Multer.File | undefined,
    user: RequestUser,
  ): Promise<Question> {
    if (!file) throw new BadRequestException('No file uploaded');
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    if (question.authoredByStaffId !== user.id && !this.isReviewer(user)) {
      throw new ForbiddenException(
        'You can only attach images to your own questions',
      );
    }

    const { url } = await this.storage.upload(
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      },
      'cbt-questions',
    );
    return this.prisma.question.update({
      where: { id },
      data: { imageUrl: url },
      include: QUESTION_INCLUDE,
    });
  }
}
