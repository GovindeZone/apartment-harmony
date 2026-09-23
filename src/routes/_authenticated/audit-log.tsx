import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/ui-bits";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/audit-log")({
  component: AuditLogPage,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
});

type AuditRow = {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  actor_user_id: string | null;
  created_at: string;
};

function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("app_audit_log")
        .select("id,action,table_name,record_id,actor_user_id,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!error) setRows((data ?? []) as AuditRow[]);
      setLoading(false);
    })();
  }, []);

  return <AppShell title="Security Audit Log" description="Administrative trail of sensitive application changes">
    <SectionCard title="Audit Trail" description="Create, update, disable, enable and blocked delete attempts are recorded by the database.">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="size-4" />
        <span>Showing the latest 200 events.</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left">
            <th className="p-3">Time</th><th className="p-3">Action</th><th className="p-3">Table</th><th className="p-3">Record</th><th className="p-3">Actor</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr> :
              rows.map(row => <tr key={row.id} className="border-b last:border-0">
                <td className="p-3 whitespace-nowrap">{new Date(row.created_at).toLocaleString("en-US")}</td>
                <td className="p-3 font-medium">{row.action}</td>
                <td className="p-3">{row.table_name || "—"}</td>
                <td className="p-3 font-mono text-xs">{row.record_id || "—"}</td>
                <td className="p-3 font-mono text-xs">{row.actor_user_id || "System"}</td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </SectionCard>
  </AppShell>;
}
