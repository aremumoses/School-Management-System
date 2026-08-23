'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatNaira } from '@/lib/format';
import type { InvoiceSummaryDto } from '@/lib/types/fees';

export function InvoicePicker({
  invoices,
  selectedId,
}: {
  invoices: InvoiceSummaryDto[];
  selectedId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('invoiceId', value);
    else params.delete('invoiceId');
    router.push(`${pathname}?${params.toString()}`);
  }

  const items = invoices.map((invoice) => ({
    value: invoice.id,
    label: `${invoice.studentName} — ${formatNaira(invoice.balance)} outstanding`,
  }));

  return (
    <div className="max-w-md space-y-1.5">
      <Label>Invoice</Label>
      <Select value={selectedId} onValueChange={update} items={items}>
        <SelectTrigger className="w-full" aria-label="Choose an invoice">
          <SelectValue placeholder="Choose an unpaid invoice…" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
