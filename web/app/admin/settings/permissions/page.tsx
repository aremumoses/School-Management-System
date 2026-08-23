import { Info } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getPermissionMatrix } from '@/lib/actions/admin';

export default async function PermissionsPage() {
  const matrix = await getPermissionMatrix();
  const entries = Object.entries(matrix);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role & Permission Matrix"
        description="What each role can do, school-wide. This is read-only — changing permissions requires a code change and a redeployment."
      />

      <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-info-soft-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Access control is enforced in the API layer via <code>@Roles()</code> decorators — this
          table is a mirror of the authoritative spec in{' '}
          <code>docs/03-roles-and-permissions.md §2</code>. Editing it here has no effect.
        </span>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Access Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map(([role, description]) => (
                <tr key={role} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                      {role}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        <strong>Key:</strong> F = Full access · E = Edit access · V = View only ·
        A = Approve-only action
      </p>
    </div>
  );
}
