import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { LessonNote, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import type { RequestUser } from '../../common/types/auth.types';
import {
  CreateLessonNoteDto,
  DuplicateLessonNoteDto,
  QueryLessonNotesDto,
  ReviewLessonNoteDto,
  UpdateLessonNoteDto,
} from './dto/lesson-note.dto';

// Reviewers see every note (docs/04 §4 — Admin approves, or delegates to
// HODs; VP mirrors the Admin's oversight scope everywhere else). Everyone
// else sees only what they submitted.
const REVIEWER_ROLES: RequestUser['roles'] = ['HOD', 'ADMIN', 'VICE_PRINCIPAL'];

const NOTE_INCLUDE = {
  classSubject: {
    include: { subject: true, class: true },
  },
  submittedBy: { select: { firstName: true, lastName: true } },
  reviewedBy: { select: { firstName: true, lastName: true } },
  term: { select: { name: true } },
} as const;

@Injectable()
export class LessonNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private isReviewer(user: RequestUser): boolean {
    return user.roles.some((role) => REVIEWER_ROLES.includes(role));
  }

  /**
   * Same "don't trust the request body" check as Stage 5's score
   * submission: the caller must hold a TeacherAssignment for exactly this
   * classSubject+term.
   */
  private async assertAssigned(
    staffId: string,
    classSubjectId: string,
    termId: string,
  ): Promise<void> {
    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: { staffId, classSubjectId, termId },
    });
    if (!assignment) {
      throw new ForbiddenException(
        'You are not assigned to teach this class/subject this term',
      );
    }
  }

  async create(
    dto: CreateLessonNoteDto,
    user: RequestUser,
  ): Promise<LessonNote> {
    await this.assertAssigned(user.id, dto.classSubjectId, dto.termId);

    return this.prisma.lessonNote.create({
      data: {
        classSubjectId: dto.classSubjectId,
        termId: dto.termId,
        weekOfTerm: dto.weekOfTerm,
        topic: dto.topic,
        nerdcReference: dto.nerdcReference ?? null,
        objectives: dto.objectives ?? null,
        content: dto.content,
        activities: dto.activities ?? null,
        evaluation: dto.evaluation ?? null,
        submittedByStaffId: user.id,
      },
      include: NOTE_INCLUDE,
    });
  }

  async list(query: QueryLessonNotesDto, user: RequestUser) {
    const where: Prisma.LessonNoteWhereInput = {
      ...(query.classSubjectId ? { classSubjectId: query.classSubjectId } : {}),
      ...(query.termId ? { termId: query.termId } : {}),
      ...(query.status ? { status: query.status } : {}),
      // Teachers see their own; HOD/Admin/VP see everything.
      ...(this.isReviewer(user) ? {} : { submittedByStaffId: user.id }),
    };
    return this.prisma.lessonNote.findMany({
      where,
      orderBy: [{ weekOfTerm: 'asc' }, { createdAt: 'desc' }],
      include: NOTE_INCLUDE,
    });
  }

  async getOrThrow(id: string, user: RequestUser): Promise<LessonNote> {
    const note = await this.prisma.lessonNote.findUnique({
      where: { id },
      include: NOTE_INCLUDE,
    });
    if (!note) throw new NotFoundException('Lesson note not found');
    if (!this.isReviewer(user) && note.submittedByStaffId !== user.id) {
      throw new ForbiddenException('You can only view your own lesson notes');
    }
    return note;
  }

  /**
   * Teacher-side edits — own notes only, never an APPROVED one. Editing a
   * RETURNED note is the "revise and resubmit" path (docs/05 §3), so it
   * goes back to PENDING with the previous review cleared.
   */
  async update(
    id: string,
    dto: UpdateLessonNoteDto,
    user: RequestUser,
  ): Promise<LessonNote> {
    const note = await this.prisma.lessonNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Lesson note not found');
    if (note.submittedByStaffId !== user.id) {
      throw new ForbiddenException('You can only edit your own lesson notes');
    }
    if (note.status === 'APPROVED') {
      throw new BadRequestException(
        'An approved lesson note can no longer be edited — duplicate it instead',
      );
    }
    // Moving the note to a different class/term re-runs the assignment check.
    const classSubjectId = dto.classSubjectId ?? note.classSubjectId;
    const termId = dto.termId ?? note.termId;
    if (classSubjectId !== note.classSubjectId || termId !== note.termId) {
      await this.assertAssigned(user.id, classSubjectId, termId);
    }

    return this.prisma.lessonNote.update({
      where: { id },
      data: {
        classSubjectId,
        termId,
        ...(dto.weekOfTerm !== undefined && { weekOfTerm: dto.weekOfTerm }),
        ...(dto.topic !== undefined && { topic: dto.topic }),
        ...(dto.nerdcReference !== undefined && {
          nerdcReference: dto.nerdcReference,
        }),
        ...(dto.objectives !== undefined && { objectives: dto.objectives }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.activities !== undefined && { activities: dto.activities }),
        ...(dto.evaluation !== undefined && { evaluation: dto.evaluation }),
        // Resubmission: RETURNED -> PENDING, previous review cleared.
        ...(note.status === 'RETURNED'
          ? {
              status: 'PENDING' as const,
              reviewedByStaffId: null,
              reviewerNotes: null,
              reviewedAt: null,
            }
          : {}),
      },
      include: NOTE_INCLUDE,
    });
  }

  async review(
    id: string,
    dto: ReviewLessonNoteDto,
    user: RequestUser,
  ): Promise<LessonNote> {
    const note = await this.prisma.lessonNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Lesson note not found');
    if (note.status !== 'PENDING') {
      throw new BadRequestException(
        `Only a PENDING lesson note can be reviewed — this one is ${note.status}`,
      );
    }
    if (dto.decision === 'RETURNED' && !dto.notes?.trim()) {
      throw new BadRequestException(
        'Notes are required when returning a lesson note — the teacher needs to know what to fix',
      );
    }

    return this.prisma.lessonNote.update({
      where: { id },
      data: {
        status: dto.decision,
        reviewedByStaffId: user.id,
        reviewerNotes: dto.notes?.trim() || null,
        reviewedAt: new Date(),
      },
      include: NOTE_INCLUDE,
    });
  }

  /**
   * The "reuse a previous term's note" requirement — a real copy that
   * starts its own approval cycle: new row, PENDING, submitted by the
   * caller, review fields empty. The caller must be assigned to the same
   * classSubject in the TARGET term (last term's assignment proves
   * nothing about this term).
   */
  async duplicate(
    id: string,
    dto: DuplicateLessonNoteDto,
    user: RequestUser,
  ): Promise<LessonNote> {
    const source = await this.getOrThrow(id, user);

    let targetTermId = dto.termId;
    if (!targetTermId) {
      const currentTerm = await this.prisma.term.findFirst({
        where: { isCurrent: true },
      });
      if (!currentTerm) {
        throw new BadRequestException(
          'No current term is set — pass termId explicitly',
        );
      }
      targetTermId = currentTerm.id;
    }

    await this.assertAssigned(user.id, source.classSubjectId, targetTermId);

    return this.prisma.lessonNote.create({
      data: {
        classSubjectId: source.classSubjectId,
        termId: targetTermId,
        weekOfTerm: dto.weekOfTerm ?? source.weekOfTerm,
        topic: source.topic,
        nerdcReference: source.nerdcReference,
        objectives: source.objectives,
        content: source.content,
        activities: source.activities,
        evaluation: source.evaluation,
        attachmentUrl: source.attachmentUrl,
        submittedByStaffId: user.id,
        // status defaults to PENDING; review fields default to null — the
        // copy earns its own approval.
      },
      include: NOTE_INCLUDE,
    });
  }

  async uploadAttachment(
    id: string,
    file: Express.Multer.File | undefined,
    user: RequestUser,
  ): Promise<LessonNote> {
    if (!file) throw new BadRequestException('No file uploaded');
    const note = await this.prisma.lessonNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Lesson note not found');
    if (note.submittedByStaffId !== user.id) {
      throw new ForbiddenException(
        'You can only attach files to your own lesson notes',
      );
    }
    if (note.status === 'APPROVED') {
      throw new BadRequestException(
        'An approved lesson note can no longer be changed',
      );
    }

    const { url } = await this.storage.upload(
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      },
      'lesson-notes',
    );

    return this.prisma.lessonNote.update({
      where: { id },
      data: { attachmentUrl: url },
      include: NOTE_INCLUDE,
    });
  }
}
