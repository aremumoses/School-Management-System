import type { components } from '@/types/api';

// options/correctAnswer are free-shape JSON (their shape depends on the
// question type), which OpenAPI can only express as an empty object — so
// widen those two fields back to unknown on top of the generated types.
export type CreateQuestionInput = Omit<
  components['schemas']['CreateQuestionDto'],
  'options' | 'correctAnswer'
> & { options?: unknown; correctAnswer?: unknown };
export type UpdateQuestionInput = Omit<
  components['schemas']['UpdateQuestionDto'],
  'options' | 'correctAnswer'
> & { options?: unknown; correctAnswer?: unknown };
export type ReviewQuestionInput = components['schemas']['ReviewQuestionDto'];
export type CreateCBTTestInput = components['schemas']['CreateCBTTestDto'];
export type UpdateCBTTestInput = components['schemas']['UpdateCBTTestDto'];
// openapi-typescript marks fields with a schema `default` as required
// (defaultNonNullable) — points is genuinely optional on the API.
export type AutoAssembleInput = Omit<components['schemas']['AutoAssembleDto'], 'points'> & {
  points?: number;
};
export type GradeEssayInput = components['schemas']['GradeEssayDto'];

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionType =
  | 'MCQ_SINGLE'
  | 'MCQ_MULTIPLE'
  | 'TRUE_FALSE'
  | 'FILL_BLANK'
  | 'MATCHING'
  | 'ESSAY';
export type QuestionStatus = 'PENDING' | 'APPROVED' | 'RETURNED';
export type CBTTestStatus = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED';
export type CBTAttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED';

export interface McqOption {
  id: string;
  text: string;
}

export interface QuestionDto {
  id: string;
  subjectId: string;
  subject: { id: string; name: string };
  topic: string;
  classLevel: number;
  difficulty: QuestionDifficulty;
  bloomTag: string | null;
  type: QuestionType;
  prompt: string;
  imageUrl: string | null;
  options: unknown;
  correctAnswer: unknown;
  status: QuestionStatus;
  reviewerNotes: string | null;
  authoredBy: { firstName: string; lastName: string };
  reviewedBy: { firstName: string; lastName: string } | null;
  createdAt: string;
}

export interface CBTTestDto {
  id: string;
  title: string;
  classSubjectId: string;
  classSubject: {
    id: string;
    subject: { id: string; name: string };
    class: { id: string; name: string };
  };
  timeLimitMinutes: number;
  attemptsAllowed: number;
  availableFrom: string;
  availableTo: string;
  passMark: number;
  instantRelease: boolean;
  showCorrectAnswersAfter: boolean;
  isMockPractice: boolean;
  assessmentComponentId: string | null;
  createdBy: { firstName: string; lastName: string };
  status: CBTTestStatus;
  _count: { questions: number; attempts: number };
  createdAt: string;
}

export interface CBTTestDetailDto extends CBTTestDto {
  questions: {
    id: string;
    questionId: string;
    order: number;
    points: number;
    question: QuestionDto;
  }[];
}

export interface StudentTestRowDto {
  id: string;
  title: string;
  classSubject: CBTTestDto['classSubject'];
  timeLimitMinutes: number;
  attemptsAllowed: number;
  availableFrom: string;
  availableTo: string;
  passMark: number;
  isMockPractice: boolean;
  status: CBTTestStatus;
  questionCount: number;
  myAttempts: {
    id: string;
    status: CBTAttemptStatus;
    startedAt: string;
    score: number | null;
    maxScore: number;
    gradedAt: string | null;
  }[];
}

export interface TakingQuestionDto {
  questionId: string;
  type: QuestionType;
  prompt: string;
  imageUrl: string | null;
  points: number;
  options: unknown;
}

export interface AttemptDto {
  id: string;
  testId: string;
  testTitle: string;
  subjectName: string;
  isMockPractice: boolean;
  status: CBTAttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  timeLimitMinutes: number;
  remainingSeconds: number;
  questions: TakingQuestionDto[];
  answers: {
    questionId: string;
    answer: unknown;
    score: number | null;
    feedback: string | null;
  }[];
  maxScore: number;
  score: number | null;
  released: boolean;
  passMark: number;
  correctAnswers: Record<string, unknown> | null;
}

export interface GradingAttemptDto {
  id: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
  status: CBTAttemptStatus;
  submittedAt: string | null;
  score: number | null;
  maxScore: number;
  gradedAt: string | null;
  essayAnswers: {
    questionId: string;
    prompt: string;
    points: number;
    answer: unknown;
    score: number | null;
    feedback: string | null;
  }[];
}

export interface TestStatsDto {
  testId: string;
  title: string;
  attemptCount: number;
  average: number | null;
  passRate: number | null;
  passMark: number;
  distribution: { range: string; count: number }[];
}

export interface MockHistoryRowDto {
  attemptId: string;
  testTitle: string;
  subjectName: string;
  takenAt: string;
  score: number | null;
  maxScore: number;
  percentage: number;
}
