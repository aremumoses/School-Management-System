import { PageHeader } from '@/components/dashboard/page-header';
import { apiFetch } from '@/lib/api';
import type { SchoolDto } from '@/lib/types/academic';
import { ModuleToggles } from './module-toggles';

export default async function ModuleSettingsPage() {
  const school = await apiFetch<SchoolDto>('/school');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Module Toggles"
        description="Enable or disable Phase 2 modules for your school. Toggling a module off hides it from the navigation but does not delete any data — it can be re-enabled at any time."
      />

      <div className="max-w-2xl">
        <ModuleToggles initialModules={school.enabledModules} />

        <p className="mt-4 text-xs text-muted-foreground">
          These modules are under active development (Stages 22–25). Enabling a module before its
          build is complete will show an empty nav link. The data store is shared — disabling and
          re-enabling is safe.
        </p>
      </div>
    </div>
  );
}
