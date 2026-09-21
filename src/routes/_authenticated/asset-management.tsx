import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/asset-management")({
  component: AssetManagementPage,
});

function AssetManagementPage() {
  return (
    <AppShell title="Asset Management" description="Manage apartment assets and related records">
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <h2 className="text-lg font-semibold">Asset Management</h2>
        <p className="mt-2 text-sm text-muted-foreground">Content and fields will be added later.</p>
      </div>
    </AppShell>
  );
}
