'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  BookDto,
  BulkImportCommitResult,
  BulkImportPreviewResult,
  CreateBookInput,
  CreateLoanInput,
  CreateReservationInput,
  LibraryAnalytics,
  LibraryLoanPolicy,
  LoanDto,
  MemberDetailDto,
  MemberSearchRow,
  OverdueRow,
  ReservationDto,
  ReservationStatus,
  SettleFineWithInvoiceInput,
  UpdateBookInput,
  UpdateLibraryPolicyInput,
  ValidBookImportRow,
} from '@/lib/types/library';

function revalidateAll() {
  revalidatePath('/librarian');
  revalidatePath('/librarian/circulation');
  revalidatePath('/librarian/members');
  revalidatePath('/librarian/reservations');
  revalidatePath('/librarian/overdue');
  revalidatePath('/librarian/analytics');
}

// --- Catalog ---

export async function listBooks(search?: string, category?: string): Promise<BookDto[]> {
  const q = new URLSearchParams();
  if (search) q.set('search', search);
  if (category) q.set('category', category);
  const qs = q.toString();
  return apiFetch<BookDto[]>(`/library/books${qs ? `?${qs}` : ''}`);
}

export async function createBook(input: CreateBookInput): Promise<BookDto> {
  const book = await apiFetch<BookDto>('/library/books', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return book;
}

export async function updateBook(id: string, input: UpdateBookInput): Promise<BookDto> {
  const book = await apiFetch<BookDto>(`/library/books/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return book;
}

// --- Bulk import ---

export async function previewBookImport(formData: FormData): Promise<BulkImportPreviewResult> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) throw new Error('Choose a spreadsheet first.');
  const body = new FormData();
  body.set('file', file);
  return apiFetch<BulkImportPreviewResult>('/library/books/bulk-import/preview', {
    method: 'POST',
    body,
  });
}

export async function commitBookImport(rows: ValidBookImportRow[]): Promise<BulkImportCommitResult> {
  const result = await apiFetch<BulkImportCommitResult>('/library/books/bulk-import/commit', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
  revalidateAll();
  return result;
}

// --- Circulation ---

export async function issueLoan(input: CreateLoanInput): Promise<LoanDto> {
  const loan = await apiFetch<LoanDto>('/library/loans', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return loan;
}

export async function returnLoan(id: string): Promise<LoanDto> {
  const loan = await apiFetch<LoanDto>(`/library/loans/${id}/return`, { method: 'POST' });
  revalidateAll();
  return loan;
}

export async function renewLoan(id: string): Promise<LoanDto> {
  const loan = await apiFetch<LoanDto>(`/library/loans/${id}/renew`, { method: 'POST' });
  revalidateAll();
  return loan;
}

export async function settleFineDirect(id: string): Promise<LoanDto> {
  const loan = await apiFetch<LoanDto>(`/library/loans/${id}/settle-fine`, { method: 'POST' });
  revalidateAll();
  return loan;
}

export async function settleFineWithInvoice(
  id: string,
  input: SettleFineWithInvoiceInput,
): Promise<LoanDto> {
  const loan = await apiFetch<LoanDto>(`/library/loans/${id}/settle-fine/invoice`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return loan;
}

// --- Reservations ---

export async function createReservation(
  bookId: string,
  input: CreateReservationInput,
): Promise<ReservationDto> {
  const reservation = await apiFetch<ReservationDto>(`/library/books/${bookId}/reserve`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return reservation;
}

export async function listReservations(status?: ReservationStatus): Promise<ReservationDto[]> {
  const qs = status ? `?status=${status}` : '';
  return apiFetch<ReservationDto[]>(`/library/reservations${qs}`);
}

// --- Members ---

export async function searchMembers(query: string): Promise<MemberSearchRow[]> {
  return apiFetch<MemberSearchRow[]>(`/library/members/search?query=${encodeURIComponent(query)}`);
}

export async function getMemberDetail(
  borrowerType: string,
  borrowerId: string,
): Promise<MemberDetailDto> {
  return apiFetch<MemberDetailDto>(`/library/members/${borrowerType}/${borrowerId}`);
}

// --- Overdue ---

export async function getOverdue(): Promise<OverdueRow[]> {
  return apiFetch<OverdueRow[]>('/library/overdue');
}

// --- Analytics ---

export async function getLibraryAnalytics(from?: string, to?: string): Promise<LibraryAnalytics> {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const qs = q.toString();
  return apiFetch<LibraryAnalytics>(`/library/analytics${qs ? `?${qs}` : ''}`);
}

// --- Settings ---

export async function getLibraryPolicy(): Promise<LibraryLoanPolicy> {
  return apiFetch<LibraryLoanPolicy>('/library/settings');
}

export async function updateLibraryPolicy(
  input: UpdateLibraryPolicyInput,
): Promise<LibraryLoanPolicy> {
  const policy = await apiFetch<LibraryLoanPolicy>('/library/settings', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return policy;
}
