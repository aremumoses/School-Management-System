'use client';

import { useState } from 'react';
import type { StaffDto } from '@/lib/types/staff';
import { StaffTrainingHistory } from './staff-training-history';
import { TrainingForm } from './training-form';

export function TrainingPageClient({ staff }: { staff: StaffDto[] }) {
  const [selectedStaffId, setSelectedStaffId] = useState('');

  return (
    <div className="space-y-6">
      <TrainingForm staff={staff} onLogged={setSelectedStaffId} />
      <StaffTrainingHistory
        staff={staff}
        staffId={selectedStaffId}
        onStaffIdChange={setSelectedStaffId}
      />
    </div>
  );
}
