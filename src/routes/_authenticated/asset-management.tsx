import { useEffect, useRef, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, FileText, History, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SectionCard, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/asset-management")({
  head: () => ({ meta: [{ title: "Asset Management — Indus Anantya Apartment" }, { name: "description", content: "Secure asset file uploads and permanent upload history." }] }),
  beforeLoad: async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) throw redirect({ to: "/auth" }); },
  component: AssetManagementPage,
});

type UploadRecord = {
  id: string; asset_group_category: string; asset_type: string; remarks: string;
  original_file_name: string; storage_path: string; file_extension: string; file_size_bytes: number;
  content_type: string | null; uploaded_by: string; uploaded_at: string; is_deleted: boolean;
  deleted_by: string | null; deleted_at: string | null; deletion_reason: string | null;
};
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["xlsx", "xls", "csv", "txt"];

function AssetManagementPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("");
  const [assetType, setAssetType] = useState("");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<UploadRecord | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState("");

  const history = useQuery({
    queryKey: ["asset_upload_history"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("asset_upload_history").select("*").order("uploaded_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as UploadRecord[];
    },
  });

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) return;
      setUserId(user.id);
      const { data } = await (supabase as any).from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (alive) setIsAdmin(Boolean(data));
    })();
    return () => { alive = false; };
  }, []);

  const upload = useMutation({
    mutationFn: async () => {
      if (!category.trim() || !assetType.trim() || !remarks.trim()) throw new Error("Asset Group Category, Asset Type and Remarks are mandatory.");
      if (!file) throw new Error("Choose a file to upload.");
      const ext = file.name.toLowerCase().split(".").pop() ?? "";
      if (!ACCEPTED_EXTENSIONS.includes(ext)) throw new Error("Only .xlsx, .xls, .csv and .txt files are accepted.");
      if (file.size < 1) throw new Error("Empty files are not accepted.");
      if (file.size > MAX_FILE_BYTES) throw new Error("Maximum file size is 20 MB.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session has expired. Sign in again.");
      const path = user.id + "/" + crypto.randomUUID() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const { error: storageError } = await supabase.storage.from("asset-upload-files").upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
      if (storageError) throw new Error(storageError.message);
      const { error } = await (supabase as any).from("asset_upload_history").insert({
        asset_group_category: category.trim(), asset_type: assetType.trim(), remarks: remarks.trim(),
        original_file_name: file.name, storage_path: path, file_extension: ext, file_size_bytes: file.size,
        content_type: file.type || null, uploaded_by: user.id,
      });
      if (error) { await supabase.storage.from("asset-upload-files").remove([path]); throw new Error(error.message); }
    },
    onSuccess: () => { toast.success("Asset file uploaded."); setCategory(""); setAssetType(""); setRemarks(""); setFile(null); if (fileRef.current) fileRef.current.value = ""; void qc.invalidateQueries({ queryKey: ["asset_upload_history"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const download = useMutation({
    mutationFn: async (record: UploadRecord) => {
      if (record.is_deleted) throw new Error("This file was deleted by an administrator.");
      const { data, error } = await supabase.storage.from("asset-upload-files").createSignedUrl(record.storage_path, 60);
      if (error || !data?.signedUrl) throw new Error(error?.message || "Could not create a download link.");
      const link = document.createElement("a"); link.href = data.signedUrl; link.download = record.original_file_name; link.rel = "noopener"; link.click();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!isAdmin || !deleteRecord) throw new Error("Only administrators can delete uploaded files.");
      if (!deleteReason.trim()) throw new Error("Deletion reason is required.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session has expired. Sign in again.");
      const { error } = await (supabase as any).from("asset_upload_history").update({ is_deleted: true, deleted_by: user.id, deleted_at: new Date().toISOString(), deletion_reason: deleteReason.trim() }).eq("id", deleteRecord.id).eq("is_deleted", false);
      if (error) throw new Error(error.message);
      const { error: storageError } = await supabase.storage.from("asset-upload-files").remove([deleteRecord.storage_path]);
      if (storageError) throw new Error("Audit entry retained, but file removal failed: " + storageError.message);
    },
    onSuccess: () => { toast.success("File deleted; audit history retained."); setDeleteRecord(null); setDeleteReason(""); void qc.invalidateQueries({ queryKey: ["asset_upload_history"] }); },
    onError: (e: Error) => { toast.error(e.message); void qc.invalidateQueries({ queryKey: ["asset_upload_history"] }); },
  });

  return <AppShell title="Asset Management" description="Secure asset file uploads and permanent upload history">
    <div className="grid gap-6">
      <SectionCard title="Upload Asset File" description="Files are stored in original format and cannot be edited or replaced.">
        <form className="grid gap-4 p-5 md:grid-cols-2" onSubmit={e => { e.preventDefault(); upload.mutate(); }}>
          <div className="space-y-2"><Label htmlFor="asset-group-category">Asset Group Category *</Label><Input id="asset-group-category" required maxLength={120} value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Electrical, Plumbing, Gym" /></div>
          <div className="space-y-2"><Label htmlFor="asset-type">Asset Type *</Label><Input id="asset-type" required maxLength={120} value={assetType} onChange={e => setAssetType(e.target.value)} placeholder="e.g. Equipment, Furniture, Appliance" /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="asset-remarks">Remarks *</Label><Textarea id="asset-remarks" required maxLength={2000} rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Describe the file contents or purpose" /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="asset-file">Select File * (.xlsx, .xls, .csv, .txt)</Label><Input id="asset-file" ref={fileRef} type="file" required accept=".xlsx,.xls,.csv,.txt,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e => setFile(e.target.files?.[0] ?? null)} /><p className="text-xs text-muted-foreground">Maximum size: 20 MB. File contents are not imported into editable asset rows.</p></div>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3"><Button type="submit" disabled={upload.isPending} className="gap-2"><Upload className="size-4" />{upload.isPending ? "Uploading…" : "Upload File"}</Button><span className="text-xs text-muted-foreground">All metadata fields are mandatory. Verify the file before uploading.</span></div>
        </form>
      </SectionCard>

      <SectionCard title="Upload History" description="Signed-in users can download files. Only administrators can delete; audit entries remain visible.">
        {history.isLoading ? <div className="p-6 text-sm text-muted-foreground">Loading upload history…</div> : history.error ? <div className="p-6 text-sm text-destructive">{(history.error as Error).message}</div> : !history.data?.length ? <EmptyState message="No asset files have been uploaded yet." /> : <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-sm">
          <thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">File</th><th className="p-3">Asset Group Category</th><th className="p-3">Asset Type</th><th className="p-3">Remarks</th><th className="p-3">Uploaded By</th><th className="p-3">Uploaded At</th><th className="p-3">Size</th><th className="p-3">Actions</th></tr></thead>
          <tbody>{history.data.map(record => <tr key={record.id} className={"border-b last:border-0 " + (record.is_deleted ? "bg-muted/40 text-muted-foreground" : "")}>
            <td className="p-3"><div className="flex items-center gap-2"><FileText className="size-4 shrink-0" /><span className="max-w-56 break-words font-medium">{record.original_file_name}</span></div><div className="mt-1 text-xs uppercase text-muted-foreground">{record.file_extension}</div>{record.is_deleted ? <div className="mt-1 text-xs font-semibold text-destructive">Deleted by admin</div> : null}</td>
            <td className="p-3">{record.asset_group_category}</td><td className="p-3">{record.asset_type}</td><td className="p-3 max-w-64 whitespace-pre-wrap break-words">{record.remarks}</td>
            <td className="p-3"><span title={record.uploaded_by}>{record.uploaded_by === userId ? "You" : record.uploaded_by.slice(0, 8) + "…"}</span></td><td className="p-3 whitespace-nowrap">{format(new Date(record.uploaded_at), "dd MMM yyyy, HH:mm")}</td><td className="p-3 whitespace-nowrap">{formatBytes(record.file_size_bytes)}</td>
            <td className="p-3"><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={record.is_deleted || download.isPending} onClick={() => download.mutate(record)}><Download className="mr-1 size-4" />Download</Button>{isAdmin && !record.is_deleted ? <Button size="sm" variant="destructive" onClick={() => { setDeleteRecord(record); setDeleteReason(""); }}><Trash2 className="mr-1 size-4" />Delete</Button> : null}</div>{record.is_deleted && record.deleted_at ? <div className="mt-1 max-w-52 text-xs">Deleted {format(new Date(record.deleted_at), "dd MMM yyyy, HH:mm")}<br />Reason: {record.deletion_reason}</div> : null}</td>
          </tr>)}</tbody></table></div>}
      </SectionCard>

      <SectionCard title="Instructions & Conditions" description="Read before uploading asset documents.">
        <div className="space-y-4 p-5 text-sm"><div className="flex gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" /><p>Confirm the file and metadata before upload. Uploaded files cannot be edited or replaced; upload a corrected version as a separate entry if needed.</p></div>
          <ul className="list-disc space-y-2 pl-6"><li>Accepted formats: Excel (.xlsx, .xls), CSV (.csv), and Notepad/plain text (.txt).</li><li>Asset Group Category, Asset Type and Remarks are mandatory.</li><li>Maximum file size is 20 MB; empty files are not accepted.</li><li>Files are retained in original format and are downloadable by signed-in users unless an administrator deletes them.</li><li>Regular users cannot edit, replace or delete files or history entries.</li><li>Only administrators can delete a file. A deletion reason is required; upload and deletion details remain in the history.</li><li>Upload only authorized documents and verify contents before submitting; files may contain sensitive community information.</li></ul>
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground"><History className="mr-2 inline size-4" />Deleted entries remain visible for audit purposes, but the file is no longer downloadable.</div>
        </div>
      </SectionCard>
    </div>
    <AlertDialog open={Boolean(deleteRecord)} onOpenChange={open => { if (!open) { setDeleteRecord(null); setDeleteReason(""); } }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete uploaded asset file?</AlertDialogTitle><AlertDialogDescription>The file will be removed. Its upload history remains with the administrator, date/time and deletion reason.</AlertDialogDescription></AlertDialogHeader>
        <div className="space-y-2"><Label htmlFor="asset-delete-reason">Deletion reason *</Label><Textarea id="asset-delete-reason" required maxLength={1000} rows={3} value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="Enter reason for deletion" /></div>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={!deleteReason.trim() || remove.isPending} onClick={e => { e.preventDefault(); remove.mutate(); }}>{remove.isPending ? "Deleting…" : "Confirm Delete"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </AppShell>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
