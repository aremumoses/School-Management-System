'use client';

import { User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TablePagination } from '@/components/dashboard/table-pagination';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ENROLLMENT_STATUS_BADGE, ENROLLMENT_STATUS_LABELS } from '@/lib/enrollment-status-labels';
import type { StudentDto, StudentListResponse } from '@/lib/types/students';
import { cn } from '@/lib/utils';

const headClass = 'h-12 font-semibold text-primary first:pl-5 last:pr-5 dark:text-heading';
const cellClass = 'py-3 first:pl-5 last:pr-5';

function initials(student: StudentDto): string {
  return `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase();
}

export function StudentsTable({
  response,
  currentPage,
}: {
  response: StudentListResponse;
  currentPage: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(response.total / response.pageSize));

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card dark:ring-1 dark:ring-foreground/10">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow className="bg-primary/5 hover:bg-primary/5">
            <TableHead className={cn(headClass, 'w-16')}>
              <span className="sr-only">Photo</span>
            </TableHead>
            <TableHead className={headClass}>Name</TableHead>
            <TableHead className={headClass}>Admission No.</TableHead>
            <TableHead className={headClass}>Class / Arm</TableHead>
            <TableHead className={headClass}>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {response.data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No students match these filters.
              </TableCell>
            </TableRow>
          ) : (
            response.data.map((student) => {
              const enrollment = student.enrollments[0];
              return (
                <TableRow key={student.id} className="hover:bg-primary/5">
                  <TableCell className={cellClass}>
                    <Avatar className="size-10">
                      {student.photoUrl && <AvatarImage src={student.photoUrl} alt="" />}
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary dark:text-heading">
                        {initials(student) || <User className="size-3.5" />}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className={cellClass}>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="font-semibold text-heading hover:text-primary hover:underline"
                      >
                        {student.firstName} {student.lastName}
                      </Link>
                      {!student.isActive && <Badge variant="error">Inactive</Badge>}
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(cellClass, 'font-medium text-primary tabular-nums dark:text-foreground')}
                  >
                    {student.admissionNumber}
                  </TableCell>
                  <TableCell className={cellClass}>
                    {enrollment ? (
                      <span className="inline-flex rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:text-foreground">
                        {enrollment.class.name} {enrollment.arm.name}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not enrolled</span>
                    )}
                  </TableCell>
                  <TableCell className={cellClass}>
                    {enrollment ? (
                      <Badge variant={ENROLLMENT_STATUS_BADGE[enrollment.status]}>
                        {ENROLLMENT_STATUS_LABELS[enrollment.status]}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {response.total > 0 && (
        <TablePagination
          firstShown={(response.page - 1) * response.pageSize + 1}
          lastShown={Math.min(response.page * response.pageSize, response.total)}
          total={response.total}
          itemName={{ singular: 'student', plural: 'students' }}
          currentPage={currentPage}
          pageCount={totalPages}
          onPageChange={goToPage}
        />
      )}
    </div>
  );
}
