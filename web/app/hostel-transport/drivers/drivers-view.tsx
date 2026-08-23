'use client';

import { IdCard, ShieldCheck, ShieldX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import type { TransportStaffRecordDto } from '@/lib/types/hostel-transport';
import { DriverFormDialog } from './driver-form-dialog';

export function DriversView({ staff }: { staff: TransportStaffRecordDto[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DriverFormDialog />
      </div>

      {staff.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IdCard />
            </EmptyMedia>
            <EmptyTitle>No driver/conductor records yet</EmptyTitle>
            <EmptyDescription>Add one above.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {staff.map((record) => (
            <Card key={record.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-foreground">
                    {record.name}{' '}
                    <Badge variant="outline" className="ml-1 text-xs">
                      {record.role === 'DRIVER' ? 'Driver' : 'Conductor'}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {record.phone}
                    {record.licenseNumber && ` · License ${record.licenseNumber}`}
                    {record.licenseExpiryDate &&
                      ` (expires ${new Date(record.licenseExpiryDate).toLocaleDateString()})`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={record.verified ? 'success' : 'warning'}>
                    {record.verified ? (
                      <ShieldCheck className="size-3" aria-hidden="true" />
                    ) : (
                      <ShieldX className="size-3" aria-hidden="true" />
                    )}
                    {record.verified ? 'Verified' : 'Unverified'}
                  </Badge>
                  <DriverFormDialog record={record} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
