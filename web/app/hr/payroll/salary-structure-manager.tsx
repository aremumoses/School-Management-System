'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSalaryStructure } from '@/lib/actions/hr';
import type { SalaryStructureDto } from '@/lib/types/hr';

function naira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

export function SalaryStructureManager({ structures }: { structures: SalaryStructureDto[] }) {
  const router = useRouter();
  const [gradeLevel, setGradeLevel] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [housingAllowance, setHousingAllowance] = useState('');
  const [transportAllowance, setTransportAllowance] = useState('');
  const [otherAllowances, setOtherAllowances] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate() {
    if (!gradeLevel.trim() || !basicSalary) {
      toast.error('Grade level and basic salary are required.');
      return;
    }
    setIsSaving(true);
    try {
      await createSalaryStructure({
        gradeLevel: gradeLevel.trim(),
        basicSalary: Number(basicSalary),
        housingAllowance: housingAllowance ? Number(housingAllowance) : undefined,
        transportAllowance: transportAllowance ? Number(transportAllowance) : undefined,
        otherAllowances: otherAllowances ? Number(otherAllowances) : undefined,
      });
      toast.success('Salary structure added.');
      setGradeLevel('');
      setBasicSalary('');
      setHousingAllowance('');
      setTransportAllowance('');
      setOtherAllowances('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add this salary structure.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary Structures</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {structures.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {structures.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span className="font-medium text-foreground">{s.gradeLevel}</span>
                <span className="text-muted-foreground">
                  Basic {naira(s.basicSalary)} · Housing {naira(s.housingAllowance)} · Transport{' '}
                  {naira(s.transportAllowance)} · Other {naira(s.otherAllowances)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="grade-level">Grade Level</Label>
            <Input
              id="grade-level"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder="Teacher I"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="basic-salary">Basic</Label>
            <Input
              id="basic-salary"
              type="number"
              min="0"
              value={basicSalary}
              onChange={(e) => setBasicSalary(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="housing-allowance">Housing</Label>
            <Input
              id="housing-allowance"
              type="number"
              min="0"
              value={housingAllowance}
              onChange={(e) => setHousingAllowance(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transport-allowance">Transport</Label>
            <Input
              id="transport-allowance"
              type="number"
              min="0"
              value={transportAllowance}
              onChange={(e) => setTransportAllowance(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="other-allowances">Other</Label>
            <Input
              id="other-allowances"
              type="number"
              min="0"
              value={otherAllowances}
              onChange={(e) => setOtherAllowances(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void handleCreate()} disabled={isSaving}>
            <Plus className="size-4" aria-hidden="true" />
            Add Grade Level
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
