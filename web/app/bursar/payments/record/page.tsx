import { PageHeader } from '@/components/dashboard/page-header';
import { apiFetch } from '@/lib/api';
import type { StudentDto, StudentListResponse } from '@/lib/types/students';
import type { InvoiceSummaryDto } from '@/lib/types/fees';
import { RecordPaymentForm } from './record-payment-form';
import { StudentSearch } from './student-search';

export default async function RecordPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; studentId?: string }>;
}) {
  const params = await searchParams;

  const searchQuery = new URLSearchParams({ pageSize: '8' });
  if (params.search) searchQuery.set('search', params.search);
  const studentsRes = params.search
    ? await apiFetch<StudentListResponse>(`/students?${searchQuery.toString()}`)
    : null;

  let selectedStudent: StudentDto | null = null;
  let invoices: InvoiceSummaryDto[] = [];
  if (params.studentId) {
    const [student, invoiceQuery] = await Promise.all([
      apiFetch<StudentDto>(`/students/${params.studentId}`),
      apiFetch<InvoiceSummaryDto[]>(`/invoices?studentId=${params.studentId}`),
    ]);
    selectedStudent = student;
    invoices = invoiceQuery
      .filter((invoice) => invoice.status !== 'PAID')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Record Payment"
        description="Search a student, confirm the invoice, take the payment — built for the counter."
      />
      <StudentSearch results={studentsRes?.data ?? null} search={params.search} selectedStudentId={params.studentId} />
      {selectedStudent && (
        <RecordPaymentForm student={selectedStudent} invoices={invoices} />
      )}
    </div>
  );
}
