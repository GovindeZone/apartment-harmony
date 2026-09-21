import { useRef, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Upload, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SectionCard, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { officialRecordsQuery, type OfficialRecord } from "@/lib/api";

async function requireTab(tabKey: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw redirect({ to: "/auth" });
  const { data: admin } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (admin) return;
  const { data: permission } = await supabase.from("user_tab_permissions").select("can_view").eq("user_id", user.id).eq("tab_key", tabKey).maybeSingle();
  if (!permission?.can_view) throw redirect({ to: "/dashboard" });
}

export const Route = createFileRoute("/_authenticated/official-records")({
  head: () => ({ meta: [{ title: "Official Records — Indus Anantya Apartment" }] }),
  beforeLoad: () => requireTab("official_records"),
  component: OfficialRecordsPage,
});

function OfficialRecordsPage() {
  const qc = useQueryClient();
  const query = useQuery(officialRecordsQuery);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<OfficialRecord | null | undefined>(undefined);

  const rows = (query.data ?? []).filter((r) => {
    const q = search.trim().toLowerCase();
    return !q || [r.document_name, r.document_description ?? "", r.additional_remarks ?? "", r.document_type].some(v => v.toLowerCase().includes(q));
  });

  const save = useMutation({
    mutationFn: async ({ id, payload, file }: { id?: string; payload: Record<string, unknown>; file?: File }) => {
      let recordId = id;
      if (id) {
        const { error } = await supabase.from("official_records").update(payload as never).eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await supabase.from("official_records").insert(payload as never).select("id").single();
        if (error || !data) throw new Error(error?.message ?? "Could not create record");
        recordId = data.id;
      }
      if (file && recordId) {
        const safe = file.name.replace(/[^\w.\-]/g, "_");
        const path = \`\${recordId}/\${Date.now()}-\${safe}\`;
        const up = await supabase.storage.from("official-records").upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) throw new Error(up.error.message);
        const { error } = await supabase.from("official_records").update({
          document_path: path,
          document_file_name: file.name,
        } as never).eq("id", recordId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Official record saved");
      setEditing(undefined);
      qc.invalidateQueries({ queryKey: ["official_records"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("official_records").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Official record deleted"); qc.invalidateQueries({ queryKey: ["official_records"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Official Records" description="Secure repository for official documents and records"
      actions={<Button className="gap-2" onClick={() => setEditing(null)}><Plus className="size-4" /> Add record</Button>}>
      <div className="mb-4 relative max-w-xl">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search document name, description, remarks or type" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <SectionCard>
        {!rows.length ? <EmptyState message="No official records found." /> : (
          <div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead>Document name</TableHead><TableHead>Description</TableHead><TableHead>Type</TableHead><TableHead>Remarks</TableHead><TableHead>Document</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader><TableBody>{rows.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.document_name}</TableCell>
              <TableCell>{r.document_description ?? "—"}</TableCell>
              <TableCell>{r.document_type}</TableCell>
              <TableCell>{r.additional_remarks ?? "—"}</TableCell>
              <TableCell>{r.document_path ? <Button variant="ghost" size="sm" className="gap-1" onClick={() => void openDoc(r.document_path!)}><FileText className="size-4" /> View</Button> : "—"}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button variant="ghost" size="icon" onClick={() => setEditing(r)}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm(\`Delete \${r.document_name}?\`)) remove.mutate(r.id); }}><Trash2 className="size-4" /></Button>
              </TableCell>
            </TableRow>
          ))}</TableBody></Table></div>
        )}
      </SectionCard>
      <RecordDialog key={editing?.id ?? "new"} record={editing ?? null} open={editing !== undefined} pending={save.isPending}
        onClose={() => setEditing(undefined)} onSave={(payload, file) => save.mutate({ id: editing?.id, payload, file })} />
    </AppShell>
  );
}

async function openDoc(path: string) {
  const { data, error } = await supabase.storage.from("official-records").createSignedUrl(path, 120);
  if (error || !data) { toast.error(error?.message ?? "Unable to open document"); return; }
  window.open(data.signedUrl, "_blank", "noopener");
}

function RecordDialog({ record, open, pending, onClose, onSave }: {
  record: OfficialRecord | null; open: boolean; pending: boolean; onClose: () => void;
  onSave: (payload: Record<string, unknown>, file?: File) => void;
}) {
  const [file, setFile] = useState<File>();
  const ref = useRef<HTMLInputElement>(null);
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("document_name") ?? "").trim();
    if (!name) { toast.error("Document name is required."); return; }
    onSave({
      document_name: name,
      document_description: String(f.get("document_description") ?? "").trim() || null,
      additional_remarks: String(f.get("additional_remarks") ?? "").trim() || null,
      document_type: String(f.get("document_type") ?? "Normal"),
    }, file);
  }
  return <Dialog open={open} onOpenChange={v => !v && onClose()}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
    <DialogHeader><DialogTitle>{record ? "Edit Official Record" : "Add Official Record"}</DialogTitle></DialogHeader>
    <form className="grid gap-4" onSubmit={submit}>
      <div className="space-y-2"><Label>Document name</Label><Input name="document_name" required defaultValue={record?.document_name ?? ""} /></div>
      <div className="space-y-2"><Label>Document Description</Label><textarea name="document_description" rows={4} defaultValue={record?.document_description ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
      <div className="space-y-2"><Label>Additional Remarks</Label><textarea name="additional_remarks" rows={3} defaultValue={record?.additional_remarks ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
      <div className="space-y-2"><Label>Document Type</Label><select name="document_type" defaultValue={record?.document_type ?? "Normal"} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option>Confidential</option><option>Semi-Confidential</option><option>Normal</option></select></div>
      <div className="space-y-2"><Label>Upload document</Label>
        <div className="rounded-lg border border-dashed p-4 flex flex-wrap items-center gap-3">
          <input ref={ref} className="hidden" type="file" accept="application/pdf,image/jpeg,.pdf,.jpg,.jpeg" onChange={e => setFile(e.target.files?.[0])} />
          <Button type="button" variant="outline" className="gap-2" onClick={() => ref.current?.click()}><Upload className="size-4" /> Choose PDF / JPEG</Button>
          <span className="text-sm text-muted-foreground">{file?.name ?? record?.document_file_name ?? "No document selected"}</span>
          {record?.document_path ? <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => void openDoc(record.document_path!)}><ExternalLink className="size-4" /> View current</Button> : null}
        </div>
        <p className="text-xs text-muted-foreground">Only PDF and JPEG documents are accepted.</p>
      </div>
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save record"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
