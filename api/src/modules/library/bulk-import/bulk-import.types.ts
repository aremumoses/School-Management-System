/** A row that passed every validation check during preview — exactly what commit expects back. */
export interface ValidBookImportRow {
  rowNumber: number;
  title: string;
  author: string;
  isbn: string | null;
  category: string;
  totalCopies: number;
  shelfLocation: string | null;
}

/** A row that failed validation — surfaced to the librarian so they can fix the spreadsheet, never silently dropped. */
export interface InvalidBookImportRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
}

export interface BulkImportPreviewResult {
  valid: ValidBookImportRow[];
  invalid: InvalidBookImportRow[];
}

export interface BulkImportCommitRowResult {
  rowNumber: number;
  success: boolean;
  bookId?: string;
  error?: string;
}

export interface BulkImportCommitResult {
  results: BulkImportCommitRowResult[];
  succeededCount: number;
  failedCount: number;
}
