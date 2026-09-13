'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { upsertEmploymentRecord } from '@/lib/actions/hr';
import type { SalaryStructureDto, StaffEmploymentRecordDto } from '@/lib/types/hr';

const NONE = '__none__';

const cardClass = 'rounded-xl ring-0 [--card-spacing:--spacing(6)] dark:ring-1';
const titleClass = 'text-lg font-semibold text-heading';

export function EmploymentRecordTab({
  staffId,
  record,
  salaryStructures,
}: {
  staffId: string;
  record: StaffEmploymentRecordDto | null;
  salaryStructures: SalaryStructureDto[];
}) {
  const [nextOfKinName, setNextOfKinName] = useState(record?.nextOfKinName ?? '');
  const [nextOfKinPhone, setNextOfKinPhone] = useState(record?.nextOfKinPhone ?? '');
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState(
    record?.nextOfKinRelationship ?? '',
  );
  const [qualifications, setQualifications] = useState(
    (record?.qualifications ?? []).join(', '),
  );
  const [department, setDepartment] = useState(record?.department ?? '');
  const [bankName, setBankName] = useState(record?.bankName ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(record?.bankAccountNumber ?? '');
  const [bankAccountName, setBankAccountName] = useState(record?.bankAccountName ?? '');
  const [salaryStructureId, setSalaryStructureId] = useState(record?.salaryStructureId ?? NONE);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await upsertEmploymentRecord(staffId, {
        nextOfKinName: nextOfKinName || undefined,
        nextOfKinPhone: nextOfKinPhone || undefined,
        nextOfKinRelationship: nextOfKinRelationship || undefined,
        qualifications: qualifications
          .split(',')
          .map((q) => q.trim())
          .filter(Boolean),
        department: department || undefined,
        bankName: bankName || undefined,
        bankAccountNumber: bankAccountNumber || undefined,
        bankAccountName: bankAccountName || undefined,
        salaryStructureId: salaryStructureId === NONE ? undefined : salaryStructureId,
      });
      toast.success('Employment record saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save employment record.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className={cardClass}>
        <CardHeader className="border-b">
          <CardTitle className={titleClass}>Next of Kin</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <FormFieldLabel htmlFor="nok-name">Name</FormFieldLabel>
            <Input
              id="nok-name"
              className="h-11"
              value={nextOfKinName}
              onChange={(e) => setNextOfKinName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <FormFieldLabel htmlFor="nok-phone">Phone</FormFieldLabel>
            <Input
              id="nok-phone"
              className="h-11"
              value={nextOfKinPhone}
              onChange={(e) => setNextOfKinPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <FormFieldLabel htmlFor="nok-relationship">Relationship</FormFieldLabel>
            <Input
              id="nok-relationship"
              className="h-11"
              value={nextOfKinRelationship}
              onChange={(e) => setNextOfKinRelationship(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className="border-b">
          <CardTitle className={titleClass}>Qualifications &amp; Department</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <FormFieldLabel htmlFor="qualifications">Qualifications (comma-separated)</FormFieldLabel>
            <Input
              id="qualifications"
              className="h-11"
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              placeholder="B.Sc Education, PGDE, NCE"
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <FormFieldLabel htmlFor="department">Department</FormFieldLabel>
              <Input
                id="department"
                className="h-11"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <FormFieldLabel>Salary Grade Level</FormFieldLabel>
              <Select
                value={salaryStructureId}
                onValueChange={(v) => v && setSalaryStructureId(v)}
                items={[
                  { value: NONE, label: 'Not set' },
                  ...salaryStructures.map((s) => ({ value: s.id, label: s.gradeLevel })),
                ]}
              >
                <SelectTrigger className="w-full data-[size=default]:h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not set</SelectItem>
                  {salaryStructures.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.gradeLevel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className="border-b">
          <CardTitle className={titleClass}>Bank Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <FormFieldLabel htmlFor="bank-name">Bank Name</FormFieldLabel>
            <Input
              id="bank-name"
              className="h-11"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <FormFieldLabel htmlFor="bank-account-number">Account Number</FormFieldLabel>
            <Input
              id="bank-account-number"
              className="h-11"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <FormFieldLabel htmlFor="bank-account-name">Account Name</FormFieldLabel>
            <Input
              id="bank-account-name"
              className="h-11"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save Employment Record'}
        </Button>
      </div>
    </div>
  );
}
