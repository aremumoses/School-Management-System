import type { components } from '@/types/api';

export type CreateBookInput = components['schemas']['CreateBookDto'];
export type UpdateBookInput = components['schemas']['UpdateBookDto'];
export type CreateLoanInput = components['schemas']['CreateLoanDto'];
export type SettleFineWithInvoiceInput = components['schemas']['SettleFineWithInvoiceDto'];
export type CreateReservationInput = components['schemas']['CreateReservationDto'];
export type UpdateLibraryPolicyInput = components['schemas']['UpdateLibraryPolicyDto'];
export type ValidBookImportRow = components['schemas']['ValidBookImportRowDto'];

export type BorrowerType = 'STUDENT' | 'STAFF';
export type ReservationStatus = 'WAITING' | 'AVAILABLE' | 'FULFILLED' | 'CANCELLED';

export interface BookDto {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string;
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoanDto {
  id: string;
  bookId: string;
  bookTitle: string;
  borrowerType: BorrowerType;
  borrowerId: string;
  borrowerName: string;
  issuedAt: string;
  dueDate: string;
  returnedAt: string | null;
  fineAmount: number | null;
  fineSettledAt: string | null;
  fineInvoiceId: string | null;
  issuedByStaffId: string;
}

export interface ReservationDto {
  id: string;
  bookId: string;
  bookTitle: string;
  borrowerType: BorrowerType;
  borrowerId: string;
  borrowerName: string;
  reservedAt: string;
  status: ReservationStatus;
}

export interface MemberSearchRow {
  borrowerType: BorrowerType;
  borrowerId: string;
  name: string;
  identifier: string;
}

export interface MemberDetailDto extends MemberSearchRow {
  borrowLimit: number;
  activeLoans: LoanDto[];
  history: LoanDto[];
}

export interface OverdueRow {
  loanId: string;
  bookTitle: string;
  borrowerType: BorrowerType;
  borrowerId: string;
  borrowerName: string;
  dueDate: string;
  daysOverdue: number;
  accruedFine: number;
}

export interface LibraryLoanPolicy {
  studentLoanDays: number;
  staffLoanDays: number;
  studentBorrowLimit: number;
  staffBorrowLimit: number;
  finePerDay: number;
}

export interface LibraryAnalytics {
  mostBorrowed: { bookId: string; title: string; category: string; loanCount: number }[];
  busiestPeriods: { period: string; loanCount: number }[];
  overdueRate: number;
  totalLoans: number;
  categoryUsage: { category: string; loanCount: number }[];
}

export interface BulkImportPreviewResult {
  valid: ValidBookImportRow[];
  invalid: { rowNumber: number; data: Record<string, string>; errors: string[] }[];
}

export interface BulkImportCommitResult {
  results: { rowNumber: number; success: boolean; bookId?: string; error?: string }[];
  succeededCount: number;
  failedCount: number;
}
