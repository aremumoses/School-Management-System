'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      <Card>
        <CardHeader>
          <CardTitle>Next of Kin</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nok-name">Name</Label>
            <Input
              id="nok-name"
              value={nextOfKinName}
              onChange={(e) => setNextOfKinName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nok-phone">Phone</Label>
            <Input
              id="nok-phone"
              value={nextOfKinPhone}
              onChange={(e) => setNextOfKinPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="nok-relationship">Relationship</Label>
            <Input
              id="nok-relationship"
              value={nextOfKinRelationship}
              onChange={(e) => setNextOfKinRelationship(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Qualifications &amp; Department</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qualifications">Qualifications (comma-separated)</Label>
            <Input
              id="qualifications"
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              placeholder="B.Sc Education, PGDE, NCE"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Salary Grade Level</Label>
              <Select
                value={salaryStructureId}
                onValueChange={(v) => v && setSalaryStructureId(v)}
                items={[
                  { value: NONE, label: 'Not set' },
                  ...salaryStructures.map((s) => ({ value: s.id, label: s.gradeLevel })),
                ]}
              >
                <SelectTrigger className="w-full">
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

      <Card>
        <CardHeader>
          <CardTitle>Bank Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bank-name">Bank Name</Label>
            <Input id="bank-name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-account-number">Account Number</Label>
            <Input
              id="bank-account-number"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bank-account-name">Account Name</Label>
            <Input
              id="bank-account-name"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save Employment Record'}
        </Button>
      </div>
    </div>
  );
}
