import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, SectionCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { byeLawRepositoryQuery, type ByeLawRecord } from "@/lib/api";

const BYE_LAW_TYPES = ["Change in Existing particulars", "New Rule", "Existing"] as const;

async function requireTab() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw redirect({ to: "/auth" });
  const { data: admin } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (admin) return;
  const { data: permission } = await supabase.from("user_tab_permissions").select("can_view").eq("user_id", user.id).eq("tab_key", "bye_law_repository").maybeSingle();
  if (!permission?.can_view) throw redirect({ to: "/dashboard" });
}

export const Route = createFileRoute("/_authenticated/bye-law-repository")({
  head: () => ({ meta: [{ title: "Bye-Law Repository — Indus Anantya Apartment" }] }),
  beforeLoad: requireTab,
  component: ByeLawRepositoryPage,
});

function ByeLawRepositoryPage() {
  const qc = useQueryClient();
  const query = useQuery(byeLawRepositoryQuery);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editing, setEditing] = useState<ByeLawRecord | null | undefined>(undefined);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (query.data ?? []).filter((r) => {
      const values = [r.bye_law_type, r.document_name, r.document_description ?? ""];
      return (!q || values.some((v) => v.toLowerCase().includes(q)))
        && (typeFilter === "all" || r.bye_law_type === typeFilter);
    });
  }, [query.data, search, typeFilter]);

  const save = useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Record<string, unknown> }) => {
      const result = id
        ? await supabase.from("bye_law_repository").update(payload as never).eq("id", id)
        : await supabase.from("bye_law_repository").insert(payload as never);
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      toast.success("Bye-Law record saved");
      setEditing(undefined);
      qc.invalidateQueries({ queryKey: ["bye_law_repository"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bye_law_repository").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Bye-Law record deleted");
      qc.invalidateQueries({ queryKey: ["bye_law_repository"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell
      title="Bye-Law Repository"
      description="Maintain approved and effective apartment bye-law records"
      actions={<Button className="gap-2" onClick={() => setEditing(null)}><Plus className="size-4" /> Add Bye-Law</Button>}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total records</p>
          <p className="mt-1 text-2xl font-semibold">{rows.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">New Rules</p>
          <p className="mt-1 text-2xl font-semibold">{rows.filter((r) => r.bye_law_type === "New Rule").length}</p>
        </div>
      </div>

      <SectionCard className="mt-6" title="Search and filter">
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search document name, description or type..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All bye-law types</option>
            {BYE_LAW_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </SectionCard>

      <SectionCard className="mt-6">
        {!rows.length ? <EmptyState message="No bye-law records found." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3">Type of Bye-Law</th>
                <th className="px-4 py-3">Document Name</th>
                <th className="px-4 py-3">Document Description</th>
                <th className="px-4 py-3">GB Approved Date</th>
                <th className="px-4 py-3">Effective Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {rows.map((record) => (
                  <tr key={record.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{record.bye_law_type}</td>
                    <td className="px-4 py-3 font-medium">{record.document_name}</td>
                    <td className="px-4 py-3 max-w-md">{record.document_description ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{record.gb_approved_date ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{record.effective_date ?? "—"}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(record)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm(`Delete ${record.document_name}?`)) remove.mutate(record.id); }}><Trash2 className="size-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <ByeLawDialog
        key={editing?.id ?? "new"}
        record={editing ?? null}
        open={editing !== undefined}
        pending={save.isPending}
        onClose={() => setEditing(undefined)}
        onSave={(payload) => save.mutate({ id: editing?.id, payload })}
      />
    </AppShell>
  );
}

function ByeLawDialog({
  record, open, pending, onClose, onSave,
}: {
  record: ByeLawRecord | null;
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("document_name") ?? "").trim();
    const approved = String(f.get("gb_approved_date") ?? "") || null;
    const effective = String(f.get("effective_date") ?? "") || null;
    if (!name) { toast.error("Document Name is required."); return; }
    if (approved && effective && effective < approved) {
      toast.error("Effective date cannot be before the GB Approved date.");
      return;
    }
    onSave({
      bye_law_type: String(f.get("bye_law_type") ?? "Existing"),
      document_name: name,
      document_description: String(f.get("document_description") ?? "").trim() || null,
      gb_approved_date: approved,
      effective_date: effective,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{record ? "Edit Bye-Law Record" : "Add Bye-Law Record"}</DialogTitle></DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label>Type of Bye-Law</Label>
            <select name="bye_law_type" defaultValue={record?.bye_law_type ?? "Existing"} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {BYE_LAW_TYPES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-2"><Label>Document Name</Label><Input name="document_name" required defaultValue={record?.document_name ?? ""} /></div>
          <div className="space-y-2">
            <Label>Document Description</Label>
            <textarea name="document_description" rows={4} defaultValue={record?.document_description ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>GB Approved Date</Label><Input name="gb_approved_date" type="date" defaultValue={record?.gb_approved_date ?? ""} /></div>
            <div className="space-y-2"><Label>Effective Date</Label><Input name="effective_date" type="date" defaultValue={record?.effective_date ?? ""} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save Bye-Law"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
