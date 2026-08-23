import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listAssetMovements } from '@/lib/actions/front-desk';
import { LogAssetForm } from './log-asset-form';

export default async function AssetMovementPage() {
  const movements = await listAssetMovements();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Movement"
        description="School property leaving or entering the premises — basic loss prevention."
      />

      <Card>
        <CardHeader>
          <CardTitle>Log a Movement</CardTitle>
        </CardHeader>
        <CardContent>
          <LogAssetForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log ({movements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No asset movements logged.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {movements.map((movement) => (
                <li key={movement.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {movement.assetDescription}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {movement.reason ?? 'No reason given'} · by {movement.loggedBy.firstName}{' '}
                      {movement.loggedBy.lastName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={movement.direction === 'OUT' ? 'warning' : 'success'}>
                      {movement.direction === 'OUT' ? 'Out' : 'In'}
                    </Badge>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {new Date(movement.loggedAt).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
