import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/mc-handbook")({
  head: () => ({ meta: [
    { title: "MC Handbook — Indus Anantya Apartment" },
    { name: "description", content: "Management Committee handbook and reference material." },
    { property: "og:title", content: "MC Handbook — Indus Anantya Apartment" },
    { property: "og:description", content: "Management Committee handbook and reference material." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MCHandbookPage,
});

function MCHandbookPage() {
  return (
    <AppShell title="MC Handbook" description="Maintain the Management Committee handbook and reference material">
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <h2 className="text-lg font-semibold">MC Handbook</h2>
        <p className="mt-2 text-sm text-muted-foreground">Content and sections will be added later.</p>
      </div>
    </AppShell>
  );
}
