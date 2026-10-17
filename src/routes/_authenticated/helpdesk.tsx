import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DepartmentSheetSummary } from "@/components/DepartmentIntegrations";
export const Route = createFileRoute("/_authenticated/helpdesk")({
  head: () => ({ meta: [{ title: "Help Desk — Indus Anantya Apartment" }] }),
  component: SheetSummaryPage,
});
function SheetSummaryPage() {
  return (
    <AppShell title="Help Desk" description="Summary records from the configured Google Sheet">
      <DepartmentSheetSummary department="helpdesk" />
    </AppShell>
  );
}
