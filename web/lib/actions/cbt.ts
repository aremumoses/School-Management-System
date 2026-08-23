'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  AttemptDto,
  AutoAssembleInput,
  CBTTestDetailDto,
  CBTTestDto,
  CreateCBTTestInput,
  CreateQuestionInput,
  GradeEssayInput,
  GradingAttemptDto,
  MockHistoryRowDto,
  QuestionDto,
  ReviewQuestionInput,
  StudentTestRowDto,
  TestStatsDto,
  UpdateCBTTestInput,
  UpdateQuestionInput,
} from '@/lib/types/cbt';

function revalidateAll() {
  revalidatePath('/teacher/cbt');
  revalidatePath('/exam-officer/question-bank');
  revalidatePath('/student/cbt');
}

// --- Questions ---

export async function listQuestions(opts: {
  subjectId?: string;
  topic?: string;
  difficulty?: string;
  type?: string;
  status?: string;
}): Promise<QuestionDto[]> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(opts)) if (v) q.set(k, v);
  const qs = q.toString();
  return apiFetch<QuestionDto[]>(`/questions${qs ? `?${qs}` : ''}`);
}

export async function createQuestion(input: CreateQuestionInput): Promise<QuestionDto> {
  const question = await apiFetch<QuestionDto>('/questions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return question;
}

export async function updateQuestion(
  id: string,
  input: UpdateQuestionInput,
): Promise<QuestionDto> {
  const question = await apiFetch<QuestionDto>(`/questions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return question;
}

export async function reviewQuestion(
  id: string,
  input: ReviewQuestionInput,
): Promise<QuestionDto> {
  const question = await apiFetch<QuestionDto>(`/questions/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return question;
}

export async function uploadQuestionImage(
  id: string,
  formData: FormData,
): Promise<QuestionDto> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) throw new Error('Choose a file first.');
  const body = new FormData();
  body.set('file', file);
  const question = await apiFetch<QuestionDto>(`/questions/${id}/image`, {
    method: 'POST',
    body,
  });
  revalidateAll();
  return question;
}

// --- Tests ---

export async function listTests(): Promise<CBTTestDto[]> {
  return apiFetch<CBTTestDto[]>('/cbt/tests');
}

export async function listStudentTests(): Promise<StudentTestRowDto[]> {
  return apiFetch<StudentTestRowDto[]>('/cbt/tests');
}

export async function getTest(id: string): Promise<CBTTestDetailDto> {
  return apiFetch<CBTTestDetailDto>(`/cbt/tests/${id}`);
}

export async function createTest(input: CreateCBTTestInput): Promise<CBTTestDto> {
  const test = await apiFetch<CBTTestDto>('/cbt/tests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return test;
}

export async function updateTest(
  id: string,
  input: UpdateCBTTestInput,
): Promise<CBTTestDto> {
  const test = await apiFetch<CBTTestDto>(`/cbt/tests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return test;
}

export async function addTestQuestions(
  id: string,
  questionIds: string[],
  points?: number,
): Promise<CBTTestDetailDto> {
  const test = await apiFetch<CBTTestDetailDto>(`/cbt/tests/${id}/questions`, {
    method: 'POST',
    body: JSON.stringify({ questionIds, points }),
  });
  revalidateAll();
  return test;
}

export async function removeTestQuestion(id: string, questionId: string): Promise<void> {
  await apiFetch(`/cbt/tests/${id}/questions/${questionId}`, { method: 'DELETE' });
  revalidateAll();
}

export async function autoAssemble(
  id: string,
  input: AutoAssembleInput,
): Promise<CBTTestDetailDto> {
  const test = await apiFetch<CBTTestDetailDto>(`/cbt/tests/${id}/auto-assemble`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return test;
}

export async function getTestStats(id: string): Promise<TestStatsDto> {
  return apiFetch<TestStatsDto>(`/cbt/tests/${id}/stats`);
}

export async function listGradingAttempts(testId: string): Promise<GradingAttemptDto[]> {
  return apiFetch<GradingAttemptDto[]>(`/cbt/tests/${testId}/attempts`);
}

// --- Taking ---

export async function startAttempt(testId: string): Promise<AttemptDto> {
  return apiFetch<AttemptDto>(`/cbt/tests/${testId}/start`, { method: 'POST' });
}

export async function getAttempt(id: string): Promise<AttemptDto> {
  return apiFetch<AttemptDto>(`/cbt/attempts/${id}`);
}

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  answer: unknown,
): Promise<void> {
  await apiFetch(`/cbt/attempts/${attemptId}/answers`, {
    method: 'PATCH',
    body: JSON.stringify({ questionId, answer }),
  });
}

export async function submitAttempt(id: string): Promise<AttemptDto> {
  const attempt = await apiFetch<AttemptDto>(`/cbt/attempts/${id}/submit`, {
    method: 'POST',
  });
  revalidatePath('/student/cbt');
  return attempt;
}

export async function gradeEssay(
  attemptId: string,
  input: GradeEssayInput,
): Promise<GradingAttemptDto[]> {
  const result = await apiFetch<GradingAttemptDto[]>(
    `/cbt/attempts/${attemptId}/grade-essay`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
  revalidateAll();
  return result;
}

export async function getMockHistory(studentId: string): Promise<MockHistoryRowDto[]> {
  return apiFetch<MockHistoryRowDto[]>(`/students/${studentId}/mock-history`);
}
