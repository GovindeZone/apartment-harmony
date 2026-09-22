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
import { contractorsQuery, type Contractor } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/contractor")({
  head: () => ({
    meta: [
      { title: "Contractor — Indus Anantya Apartment" },
      { name: "description", content: "Manage contractor companies, contracts and contract documents." },
    ],
  }),
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: admin } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (admin) return;
    const { data: permission } = await supabase.from("user_tab_permissions").select("can_view").eq("user_id", user.id).eq("tab_key", "contractor").maybeSingle();
    if (!permission?.can_view) throw redirect({ to: "/dashboard" });
  },
  component: ContractorPage,
});

function ContractorPage() {
  const qc = useQueryClient();
  const contractors = useQuery(contractorsQuery);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Contractor | null | undefined>(undefined);

  const rows = (contractors.data ?? []).filter((c) => {
    const needle = q.trim().toLowerCase();
    return !needle || [c.company_name, c.proprietor_owner_name ?? "", c.contact_person ?? "", c.registration_number ?? "", c.phone1 ?? "", c.phone2 ?? "", c.phone3 ?? "", c.email ?? ""]
      .some((v) => v.toLowerCase().includes(needle));
  });

  const save = useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Record<string, unknown> }) => {
      const { error } = id
        ? await supabase.from("contractors").update(payload as never).eq("id", id)
        : await supabase.from("contractors").insert(payload as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Contractor record saved");
      setEditing(undefined);
      qc.invalidateQueries({ queryKey: ["contractors"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contractors").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Contractor record deleted");
      qc.invalidateQueries({ queryKey: ["contractors"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Contractor" description="Contractor companies, contract particulars and documents" actions={<Button className="gap-2" onClick={() => setEditing(null)}><Plus className="size-4" /> Add contractor</Button>}>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search company, proprietor, contact, registration or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <SectionCard>
        {rows.length === 0 ? <EmptyState message="No contractor companies found." /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Company</TableHead><TableHead>Proprietor / Owner</TableHead><TableHead>Contact person</TableHead>
                <TableHead>Registration no.</TableHead><TableHead>Phone</TableHead><TableHead>Contract period</TableHead><TableHead>Contract amount</TableHead><TableHead>Document</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>{rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.company_name}</TableCell>
                  <TableCell>{c.proprietor_owner_name ?? "—"}</TableCell>
                  <TableCell>{c.contact_person ?? "—"}</TableCell>
                  <TableCell>{c.registration_number ?? "—"}</TableCell>
                  <TableCell>{c.phone1 ?? c.phone2 ?? c.phone3 ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.contract_start_date ?? "—"} → {c.contract_end_date ?? "—"}</TableCell>
                  <TableCell>{c.contract_amount == null ? "—" : `₹${Number(c.contract_amount).toLocaleString("en-IN")}`}</TableCell>
                  <TableCell>{c.contract_document_path ? <Button variant="ghost" size="sm" className="gap-1" onClick={() => void openDocument(c.contract_document_path)}><FileText className="size-4" /> View</Button> : "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing(c)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Delete" className="text-destructive hover:text-destructive" onClick={() => { if (confirm(`Delete ${c.company_name}? Staff linked to this contractor will no longer have a contractor company.`)) remove.mutate(c.id); }}><Trash2 className="size-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
      <ContractorFormDialog key={editing?.id ?? "new"} open={editing !== undefined} record={editing ?? null} pending={save.isPending} onClose={() => setEditing(undefined)} onSave={(payload) => save.mutate(editing?.id ? { id: editing.id, payload } : { payload })} />
    </AppShell>
  );
}

async function openDocument(path: string | null) {
  if (!path) return;
  const { data, error } = await supabase.storage.from("contractor-documents").createSignedUrl(path, 120);
  if (error || !data) { toast.error(error?.message ?? "Could not open contract document"); return; }
  window.open(data.signedUrl, "_blank", "noopener");
}

function ContractorFormDialog({ open, record, pending, onClose, onSave }: {
  open: boolean; record: Contractor | null; pending: boolean; onClose: () => void; onSave: (payload: Record<string, unknown>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [documentPath, setDocumentPath] = useState(record?.contract_document_path ?? "");
  const [documentName, setDocumentName] = useState(record?.contract_document_name ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim();
    const start = str("contract_start_date");
    const end = str("contract_end_date");
    if (start && end && end < start) { toast.error("Contract end date cannot be before the start date."); return; }
    onSave({
      company_name: str("company_name"),
      proprietor_owner_name: str("proprietor_owner_name") || null,
      contact_person: str("contact_person") || null,
      registration_number: str("registration_number") || null,
      phone1: str("phone1").replace(/\D/g, "") || null,
      phone2: str("phone2").replace(/\D/g, "") || null,
      phone3: str("phone3").replace(/\D/g, "") || null,
      email: str("email") || null,
      website: str("website") || null,
      contract_start_date: start || null,
      contract_end_date: end || null,
      contract_amount: str("contract_amount") ? Number(str("contract_amount")) : null,
      contract_particulars: str("contract_particulars") || null,
      contract_document_path: documentPath || null,
      contract_document_name: documentName || null,
    });
  }

  async function upload(file: File) {
    if (!record) { toast.error("Save the contractor first, then upload the contract document."); return; }
    setUploading(true);
    try {
      const path = `${record.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const up = await supabase.storage.from("contractor-documents").upload(path, file);
      if (up.error) throw new Error(up.error.message);
      setDocumentPath(path);
      setDocumentName(file.name);
      toast.success("Contract document uploaded. Save the record to keep the document reference.");
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{record ? `Edit ${record.company_name}` : "Add contractor company"}</DialogTitle></DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <Field name="company_name" label="Company name" required defaultValue={record?.company_name ?? ""} />
          <Field name="proprietor_owner_name" label="Proprietor / Owner Name" defaultValue={record?.proprietor_owner_name ?? ""} />
          <Field name="contact_person" label="Contact person" defaultValue={record?.contact_person ?? ""} />
          <Field name="registration_number" label="Registration number" defaultValue={record?.registration_number ?? ""} />
          <PhoneField name="phone1" label="Phone number 1" defaultValue={record?.phone1 ?? ""} />
          <PhoneField name="phone2" label="Phone number 2" defaultValue={record?.phone2 ?? ""} />
          <PhoneField name="phone3" label="Phone number 3" defaultValue={record?.phone3 ?? ""} />
          <Field name="email" label="Email" type="email" defaultValue={record?.email ?? ""} />
          <Field name="website" label="Website" type="url" placeholder="https://" defaultValue={record?.website ?? ""} />
          <Field name="contract_start_date" label="Contract start date" type="date" defaultValue={record?.contract_start_date ?? ""} />
          <Field name="contract_end_date" label="Contract end date" type="date" defaultValue={record?.contract_end_date ?? ""} />
          <Field name="contract_amount" label="Contract amount" type="number" defaultValue={record?.contract_amount == null ? "" : String(record.contract_amount)} />
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contract_particulars">Contract particulars</Label>
            <textarea id="contract_particulars" name="contract_particulars" defaultValue={record?.contract_particulars ?? ""} rows={5} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Scope of work, services covered, terms and other essential contract details" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Contract document</Label>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border p-4">
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
              <Button type="button" variant="outline" className="gap-2" disabled={uploading || !record} onClick={() => fileRef.current?.click()}><Upload className="size-4" /> {uploading ? "Uploading…" : "Upload contract document"}</Button>
              {record ? <span className="text-sm text-muted-foreground">{documentName || "No document selected"}</span> : <span className="text-xs text-muted-foreground">Save the contractor record first to enable document upload.</span>}
              {documentPath ? <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => void openDocument(documentPath)}><ExternalLink className="size-4" /> View</Button> : null}
            </div>
            <p className="text-xs text-muted-foreground">Private contract document storage.</p>
          </div>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending || uploading}>{pending ? "Saving…" : "Save contractor"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PhoneField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} inputMode="numeric" maxLength={10} pattern="[0-9]{10}" defaultValue={defaultValue} placeholder="10-digit number" /></div>;
}

function Field({ name, label, type = "text", required, defaultValue, placeholder }: {
  name: string; label: string; type?: string; required?: boolean; defaultValue?: string; placeholder?: string;
}) {
  return <div className="space-y-2"><Label htmlFor={name}>{label} {required ? <span className="text-destructive">*</span> : null}</Label><Input id={name} name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} /></div>;
}
