'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api';
import type {
  AssessmentComponentDto,
  BroadsheetResponseDto,
  ClassTermResultStatusDto,
  GeneratePromotionSuggestionsInput,
  PrincipalCommentInput,
  PromoteStudentInput,
  PromotionSuggestionDto,
  ReportCardDataDto,
  ResultStatusDto,
  ReturnResultInput,
  ScoreGridResponseDto,
  ScoreSubmissionDto,
  StudentBroadsheetRowDto,
  StudentConductRowDto,
  SubmitConductInput,
  SubmitScoresInput,
  SuggestCommentInput,
  SuggestCommentResponse,
  SuggestCommentResult,
  TranscriptResponseDto,
  UnlockScoresInput,
} from '@/lib/types/results';

export async function getAssessmentComponents(
  termId: string,
  subjectId?: string,
): Promise<AssessmentComponentDto[]> {
  const query = new URLSearchParams({ termId });
  if (subjectId) query.set('subjectId', subjectId);
  return apiFetch<AssessmentComponentDto[]>(`/assessment-components?${query.toString()}`);
}

export async function getScores(classSubjectId: string, termId: string): Promise<ScoreGridResponseDto> {
  return apiFetch<ScoreGridResponseDto>(
    `/scores?classSubjectId=${classSubjectId}&termId=${termId}`,
  );
}

export async function submitScores(input: SubmitScoresInput): Promise<ScoreSubmissionDto> {
  const result = await apiFetch<ScoreSubmissionDto>('/scores/submit', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/teacher/scores');
  revalidatePath('/exam-officer/broadsheet');
  return result;
}

export async function unlockScores(input: UnlockScoresInput): Promise<ScoreSubmissionDto> {
  const result = await apiFetch<ScoreSubmissionDto>('/scores/unlock', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/teacher/scores');
  revalidatePath('/exam-officer/broadsheet');
  return result;
}

export async function getResultStatus(armId: string, termId: string): Promise<ResultStatusDto> {
  return apiFetch<ResultStatusDto>(`/results/${armId}/${termId}/status`);
}

export async function getBroadsheet(armId: string, termId: string): Promise<BroadsheetResponseDto> {
  return apiFetch<BroadsheetResponseDto>(`/results/${armId}/${termId}/broadsheet`);
}

export async function getConductRatings(armId: string, termId: string): Promise<StudentConductRowDto[]> {
  return apiFetch<StudentConductRowDto[]>(`/results/${armId}/${termId}/conduct`);
}

export async function submitConduct(
  armId: string,
  termId: string,
  studentId: string,
  input: SubmitConductInput,
): Promise<void> {
  await apiFetch(`/results/${armId}/${termId}/students/${studentId}/conduct`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/teacher/class-ratings');
}

/**
 * Stage 30 — returns a draft only, never saves anything. The only way a
 * comment reaches the database is submitConduct/setPrincipalComment above,
 * called explicitly by the teacher/admin after reviewing (and possibly
 * editing) what comes back here.
 *
 * Catches its own errors and returns a result object rather than
 * throwing — a thrown error here (rate-limited, LLM down) is an
 * "expected" failure in Next's own terms, and modeling it as a return
 * value avoids relying on a thrown Server Action error surviving intact
 * to the client in a production build.
 */
export async function suggestComment(
  armId: string,
  termId: string,
  studentId: string,
  input: SuggestCommentInput,
): Promise<SuggestCommentResult> {
  try {
    const { suggestion } = await apiFetch<SuggestCommentResponse>(
      `/results/${armId}/${termId}/students/${studentId}/suggest-comment`,
      { method: 'POST', body: JSON.stringify(input) },
    );
    return { success: true, suggestion };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof ApiError && error.status === 429
          ? 'Too many suggestions requested — try again in a moment.'
          : error instanceof Error
            ? error.message
            : "Couldn't generate a suggestion — write the comment directly.",
    };
  }
}

export async function setPrincipalComment(
  armId: string,
  termId: string,
  studentId: string,
  input: PrincipalCommentInput,
): Promise<void> {
  await apiFetch(`/results/${armId}/${termId}/students/${studentId}/principal-comment`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidatePath('/admin/results');
}

export async function collateResults(armId: string, termId: string): Promise<StudentBroadsheetRowDto[]> {
  const result = await apiFetch<StudentBroadsheetRowDto[]>(`/results/${armId}/${termId}/collate`, {
    method: 'POST',
  });
  revalidatePath('/exam-officer/broadsheet');
  revalidatePath('/admin/results');
  return result;
}

export async function returnResults(
  armId: string,
  termId: string,
  input: ReturnResultInput,
): Promise<ClassTermResultStatusDto> {
  const result = await apiFetch<ClassTermResultStatusDto>(`/results/${armId}/${termId}/return`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/admin/results');
  revalidatePath('/exam-officer/broadsheet');
  return result;
}

/** Admin's "Approve & Publish" button is one click — composes the two backend steps. */
export async function approveAndPublishResults(
  armId: string,
  termId: string,
): Promise<ClassTermResultStatusDto> {
  await apiFetch(`/results/${armId}/${termId}/approve`, { method: 'POST' });
  const result = await apiFetch<ClassTermResultStatusDto>(`/results/${armId}/${termId}/publish`, {
    method: 'POST',
  });
  revalidatePath('/admin/results');
  revalidatePath('/exam-officer/broadsheet');
  revalidatePath('/student/results');
  revalidatePath('/parent/results');
  return result;
}

export async function generateReportCards(armId: string, termId: string): Promise<{ enqueued: number }> {
  return apiFetch<{ enqueued: number }>(`/results/${armId}/${termId}/generate-report-cards`, {
    method: 'POST',
  });
}

export async function getPromotionSuggestions(
  sessionId: string,
  input: GeneratePromotionSuggestionsInput,
): Promise<PromotionSuggestionDto[]> {
  return apiFetch<PromotionSuggestionDto[]>(`/sessions/${sessionId}/promotion-suggestions`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function promoteStudent(studentId: string, input: PromoteStudentInput): Promise<void> {
  await apiFetch(`/students/${studentId}/promote`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/admin/students');
}

export async function getTranscript(studentId: string): Promise<TranscriptResponseDto> {
  return apiFetch<TranscriptResponseDto>(`/students/${studentId}/transcript`);
}

/**
 * Returns `null` (not a thrown error) when the result isn't published yet
 * — the report-card pages treat that as a normal, calm "not yet published"
 * state, not a failure to render.
 */
export async function getReportCardData(
  armId: string,
  termId: string,
  studentId: string,
): Promise<ReportCardDataDto | null> {
  try {
    return await apiFetch<ReportCardDataDto>(
      `/results/${armId}/${termId}/students/${studentId}/report-card-data`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return null;
    }
    throw error;
  }
}
