'use client';

import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-3">
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Name</TableHead>
              <TableHead>Admission No.</TableHead>
              <TableHead>Class / Arm</TableHead>
              <TableHead>Status</TableHead>
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
                  <TableRow key={student.id} className="hover:bg-accent/60">
                    <TableCell>
                      <Avatar className="size-8">
                        {student.photoUrl && <AvatarImage src={student.photoUrl} alt="" />}
                        <AvatarFallback>
                          {initials(student) || <User className="size-3.5" />}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {student.firstName} {student.lastName}
                        </Link>
                        {!student.isActive && <Badge variant="error">Inactive</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
                      {student.admissionNumber}
                    </TableCell>
                    <TableCell className="text-sm">
                      {enrollment ? (
                        <>
                          {enrollment.class.name}{' '}
                          <span className="text-muted-foreground">{enrollment.arm.name}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Not enrolled</span>
                      )}
                    </TableCell>
                    <TableCell>
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
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Page {response.page} of {totalPages} — {response.total} student
            {response.total === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Next
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
