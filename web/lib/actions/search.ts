'use server';

import { auth } from '@/auth';
import { apiFetch } from '@/lib/api';
import type { StaffDto } from '@/lib/types/staff';
import type { StudentListResponse } from '@/lib/types/students';

/** One row in the command palette's record results (design system §5). */
export interface SearchHit {
  kind: 'student' | 'staff';
  id: string;
  title: string;
  /** Secondary line — admission number, email, role. */
  subtitle: string;
  href: string;
}

export interface SearchResults {
  students: SearchHit[];
  staff: SearchHit[];
}

const EMPTY: SearchResults = { students: [], staff: [] };

/** Roles whose dashboards actually have a staff directory to link into. */
const STAFF_SEARCH_ROLES = ['ADMIN', 'HR_OFFICER', 'EXAM_OFFICER'] as const;

/**
 * Backs the ⌘K palette's "records" section.
 *
 * There is no single global-search endpoint on the API, so this fans out to
 * the existing role-scoped list endpoints and normalises their shapes. Both
 * calls are deliberately independent and independently caught: `/students`
 * is `@Roles()` (any authenticated user, scoped server-side — a parent only
 * ever matches their own children), whereas `/staff` is limited to a few
 * roles, so a teacher searching would otherwise get a 403 that killed the
 * whole result set. A failed leg returns empty rather than surfacing an
 * error — the palette always still has navigation results to show.
 */
export async function globalSearch(query: string): Promise<SearchResults> {
  const term = query.trim();
  if (term.length < 2) return EMPTY;

  const session = await auth();
  const roles = session?.user.roles ?? [];
  const canSearchStaff = STAFF_SEARCH_ROLES.some((role) =>
    (roles as readonly string[]).includes(role),
  );

  const [students, staff] = await Promise.all([
    searchStudents(term),
    canSearchStaff ? searchStaff(term) : Promise.resolve([]),
  ]);

  return { students, staff };
}

async function searchStudents(term: string): Promise<SearchHit[]> {
  try {
    const params = new URLSearchParams({ search: term, page: '1', pageSize: '5' });
    const response = await apiFetch<StudentListResponse>(`/students?${params.toString()}`);
    return response.data.map((student) => ({
      kind: 'student' as const,
      id: student.id,
      title: `${student.firstName} ${student.lastName}`,
      subtitle: student.admissionNumber,
      href: `/admin/students/${student.id}`,
    }));
  } catch {
    return [];
  }
}

async function searchStaff(term: string): Promise<SearchHit[]> {
  try {
    // /staff has no `search` query param — it returns the full directory,
    // which for a single school is a few hundred rows at most, so filtering
    // here is cheaper than adding an endpoint. Revisit if the school ever
    // grows past the point where that response is cheap to serialise.
    const all = await apiFetch<StaffDto[]>('/staff');
    const needle = term.toLowerCase();
    return all
      .filter((member) => {
        const name = `${member.firstName} ${member.lastName}`.toLowerCase();
        return name.includes(needle) || member.email.toLowerCase().includes(needle);
      })
      .slice(0, 5)
      .map((member) => ({
        kind: 'staff' as const,
        id: member.id,
        title: `${member.firstName} ${member.lastName}`,
        subtitle: member.email,
        href: `/admin/staff/${member.id}`,
      }));
  } catch {
    return [];
  }
}
