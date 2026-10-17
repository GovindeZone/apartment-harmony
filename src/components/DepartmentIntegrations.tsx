import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DEPARTMENT_LABELS,
  integrationRequest,
  type Department,
  type DepartmentIntegration,
} from "@/lib/department-integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function DepartmentIntegrationSettings() {
  return (
    <div className="space-y-5">
      {(Object.keys(DEPARTMENT_LABELS) as Department[]).map((department) => (
        <IntegrationEditor key={department} department={department} />
      ))}
    </div>
  );
}
function IntegrationEditor({ department }: { department: Department }) {
  const query = useQuery({
    queryKey: ["integration-config", department],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      const response = await fetch(
        `/api/department-integration?department=${department}&configuration=true`,
        { headers: { Authorization: `Bearer ${data.session?.access_token}` } },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      return result as DepartmentIntegration;
    },
  });
  const [draft, setDraft] = useState<DepartmentIntegration | null>(null);
  const [saving, setSaving] = useState(false);
  const config = draft ?? query.data;
  async function save() {
    if (!config) return;
    setSaving(true);
    const { department: _, ...values } = config;
    try {
      await integrationRequest(department, { method: "PUT", body: JSON.stringify(values) });
      toast.success("Integration settings saved.");
      await query.refetch();
      setDraft(null);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="rounded-xl border bg-card p-5 space-y-4">
      <h2 className="font-semibold">{DEPARTMENT_LABELS[department]} — Google Sheets & WhatsApp</h2>
      {query.isError ? (
        <p role="alert">{query.error.message}</p>
      ) : !config ? (
        <p>Loading…</p>
      ) : (
        <>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setDraft({ ...config, enabled: e.target.checked })}
            />
            Enable Google Sheets summary
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["spreadsheet_id", "Google Spreadsheet ID"],
                ["sheet_tab", "Sheet tab name"],
                ["whatsapp_number", "WhatsApp number (with country code)"],
                ["phone_number_id", "Meta Phone Number ID"],
                ["business_account_id", "WhatsApp Business Account ID"],
                ["webhook_url", "WhatsApp webhook URL"],
              ] as const
            ).map(([field, label]) => (
              <label className="space-y-2 text-sm" key={field}>
                <span>{label}</span>
                <Input
                  value={config[field]}
                  onChange={(e) => setDraft({ ...config, [field]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Share this department’s sheet with its Google service account. The server secret is
            GOOGLE_SERVICE_ACCOUNT_{department.toUpperCase()} (service account JSON). Keep Meta
            access tokens in server secrets. The webhook URL points to your separately deployed
            WhatsApp automation.
          </p>
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save Settings"}
          </Button>
        </>
      )}
    </section>
  );
}
type SheetData = { headers: string[]; rows: string[][]; retrievedAt: string; limited: boolean };
export function DepartmentSheetSummary({ department }: { department: Department }) {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["department-sheet", department],
    queryFn: () => integrationRequest<SheetData>(department),
    retry: false,
  });
  const rows = (query.data?.rows ?? []).filter((row) =>
    row.some((cell) => String(cell).toLowerCase().includes(search.toLowerCase())),
  );
  const statusIndex =
    query.data?.headers.findIndex((header) => header.trim().toLowerCase() === "status") ?? -1;
  const counts = new Map<string, number>();
  if (statusIndex >= 0)
    for (const row of rows) {
      const status = row[statusIndex] || "Unspecified";
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="font-semibold">{DEPARTMENT_LABELS[department]} — Google Sheets summary</h2>
        <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
          Refresh
        </Button>
      </div>
      {query.isPending ? (
        <p>Loading Google Sheet…</p>
      ) : query.isError ? (
        <p role="alert">{query.error.message}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {rows.length} records · Retrieved {new Date(query.data.retrievedAt).toLocaleString()}
            {query.data.limited ? " · First 5,000 records only" : ""}
          </p>
          <Input
            aria-label="Search sheet records"
            placeholder="Search records…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {counts.size > 0 && (
            <div className="flex flex-wrap gap-3">
              {[...counts].map(([status, count]) => (
                <div key={status} className="rounded-lg border px-4 py-2 text-sm">
                  {status}: <strong>{count}</strong>
                </div>
              ))}
            </div>
          )}
          {!rows.length ? (
            <p>No records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {query.data.headers.map((header, i) => (
                      <th key={i} className="p-3 text-left whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t">
                      {query.data.headers.map((_, j) => (
                        <td key={j} className="p-3 max-w-md break-words">
                          {row[j] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
