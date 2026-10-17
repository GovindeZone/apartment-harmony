import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DepartmentSheetSummary } from "@/components/DepartmentIntegrations";
export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({ meta: [{ title: "Security — Indus Anantya Apartment" }] }),
  component: SheetSummaryPage,
});
function SheetSummaryPage() {
  return (
    <AppShell title="Security" description="Summary records from the configured Google Sheet">
      <DepartmentSheetSummary department="security" />
    </AppShell>
  );
}
