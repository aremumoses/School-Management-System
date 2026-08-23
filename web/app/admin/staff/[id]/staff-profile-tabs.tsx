'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  SalaryStructureDto,
  StaffDocumentDto,
  StaffEmploymentRecordDto,
} from '@/lib/types/hr';
import type { StaffDto, TeacherAssignmentDto } from '@/lib/types/staff';
import { BioDataCard } from './bio-data-card';
import { EmploymentRecordTab } from './employment-record-tab';
import { HrDocumentsTab } from './hr-documents-tab';
import { RoleAssignment } from './role-assignment';
import {
  type ClassSubjectOption,
  type TermOption,
  TeachingAssignmentsSection,
} from './teaching-assignments-section';

export function StaffProfileTabs({
  staff,
  isSelf,
  assignments,
  classSubjectOptions,
  termOptions,
  employmentRecord,
  salaryStructures,
  documents,
  defaultTab,
  // Academic tabs (bio-data/roles/teaching) are Admin's — their mutations
  // are all @Roles('ADMIN') on the backend. HR_OFFICER only ever reaches
  // this component via /hr/staff/[id], where it should show just the
  // separate, additive HR layer (employment record + documents) rather
  // than tabs whose edit actions would 403 for them.
  variant = 'admin',
}: {
  staff: StaffDto;
  isSelf: boolean;
  assignments: TeacherAssignmentDto[];
  classSubjectOptions: ClassSubjectOption[];
  termOptions: TermOption[];
  employmentRecord: StaffEmploymentRecordDto | null;
  salaryStructures: SalaryStructureDto[];
  documents: StaffDocumentDto[];
  defaultTab?: string;
  variant?: 'admin' | 'hr';
}) {
  if (variant === 'hr') {
    return (
      <Tabs defaultValue={defaultTab ?? 'employment-record'}>
        <TabsList>
          <TabsTrigger value="employment-record">Employment Record</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="employment-record" className="pt-4">
          <EmploymentRecordTab
            staffId={staff.id}
            record={employmentRecord}
            salaryStructures={salaryStructures}
          />
        </TabsContent>
        <TabsContent value="documents" className="pt-4">
          <HrDocumentsTab staffId={staff.id} documents={documents} />
        </TabsContent>
      </Tabs>
    );
  }

  return (
    <Tabs defaultValue={defaultTab ?? 'bio-data'}>
      <div className="overflow-x-auto">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="bio-data">Bio-data</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="teaching">Teaching</TabsTrigger>
          <TabsTrigger value="employment-record">Employment Record</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="bio-data" className="pt-4">
        <BioDataCard staff={staff} isSelf={isSelf} />
      </TabsContent>
      <TabsContent value="roles" className="pt-4">
        <RoleAssignment staffId={staff.id} roles={staff.roles} />
      </TabsContent>
      <TabsContent value="teaching" className="pt-4">
        <TeachingAssignmentsSection
          staffId={staff.id}
          assignments={assignments}
          classSubjectOptions={classSubjectOptions}
          termOptions={termOptions}
        />
      </TabsContent>
      <TabsContent value="employment-record" className="pt-4">
        <EmploymentRecordTab
          staffId={staff.id}
          record={employmentRecord}
          salaryStructures={salaryStructures}
        />
      </TabsContent>
      <TabsContent value="documents" className="pt-4">
        <HrDocumentsTab staffId={staff.id} documents={documents} />
      </TabsContent>
    </Tabs>
  );
}
