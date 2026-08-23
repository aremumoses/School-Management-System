import { PageHeader } from '@/components/dashboard/page-header';
import { listHostels, listInventory } from '@/lib/actions/hostel-transport';
import { InventoryView } from './inventory-view';

export default async function InventoryPage() {
  const [items, hostels] = await Promise.all([listInventory(), listHostels()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Furniture per room, beddings per boarder — condition tracked per item."
      />
      <InventoryView items={items} hostels={hostels} />
    </div>
  );
}
