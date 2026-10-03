import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Pencil, Plus, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { AppShell } from "@/components/AppShell";
import { SectionCard, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/asset-management")({
  head: () => ({ meta: [{ title: "Asset Management — Indus Anantya Apartment" }] }),
  component: AssetManagementPage,
});

type AssetStatus = "Active" | "Retired";
type AssetData = { columns: string[]; values: unknown[] };
type AssetRecord = {
  id: string;
  asset_category: string;
  asset_data: AssetData;
  asset_status: AssetStatus;
  asset_status_date: string;
  created_at: string;
  updated_at: string;
};
type DraftRow = { columns: string[]; values: unknown[] };

const today = () => new Date().toISOString().slice(0, 10);

function AssetManagementPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogFileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("");
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [editing, setEditing] = useState<AssetRecord | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const records = useQuery({
    queryKey: ["asset_records"],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db.from("asset_records").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as AssetRecord[];
    },
  });

  const categories = useMemo(
    () => Array.from(new Set((records.data ?? []).map((record) => record.asset_category).filter(Boolean))).sort(),
    [records.data],
  );

  const allColumns = useMemo(
    () => Array.from(new Set((records.data ?? []).flatMap((record) => record.asset_data.columns))),
    [records.data],
  );

  const saveUploaded = useMutation({
    mutationFn: async () => {
      if (!category.trim()) throw new Error("Asset Category is required.");
      if (!draftRows.length) throw new Error("Upload an Excel/CSV file containing asset records.");

      const db = supabase as any;
      const payload = draftRows.map((row) => ({
        asset_category: category.trim(),
        asset_data: { columns: row.columns, values: row.values },
        asset_status: "Active",
        asset_status_date: today(),
      }));
      const { error } = await db.from("asset_records").insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(String(draftRows.length) + " asset record" + (draftRows.length === 1 ? "" : "s") + " saved.");
      setDraftRows([]);
      setCategory("");
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ["asset_records"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateRecord = useMutation({
    mutationFn: async ({
      id,
      assetCategory,
      assetData,
      assetStatus,
      assetStatusDate,
    }: {
      id: string;
      assetCategory: string;
      assetData: AssetData;
      assetStatus: AssetStatus;
      assetStatusDate: string;
    }) => {
      if (!assetCategory.trim()) throw new Error("Asset Category is required.");
      if (!assetStatusDate) throw new Error("Asset Status Date is required.");

      const db = supabase as any;
      const { error } = await db.from("asset_records").update({
        asset_category: assetCategory.trim(),
        asset_data: assetData,
        asset_status: assetStatus,
        asset_status_date: assetStatusDate,
      }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Asset record updated.");
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["asset_records"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function handleFile(file?: File) {
    if (!file) return;
    const extension = file.name.toLowerCase().split(".").pop();
    if (!extension || !["xlsx", "xls", "csv"].includes(extension)) {
      toast.error("Only Excel (.xlsx/.xls) or CSV (.csv) files are supported.");
      return;
    }

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("The uploaded file does not contain a worksheet.");
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) throw new Error("The uploaded worksheet could not be read.");

      const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        defval: "",
        raw: false,
      });
      if (!matrix.length) throw new Error("The uploaded file is empty.");

      const columns = (matrix[0] ?? []).map((value) => String(value ?? ""));
      if (!columns.length || columns.every((column) => column === "")) {
        throw new Error("The first row must contain the asset column headers.");
      }

      const rows = matrix
        .slice(1)
        .filter((row) => row.some((value) => String(value ?? "").trim() !== ""))
        .map((row) => ({ columns, values: columns.map((_, index) => row[index] ?? "") }));

      if (!rows.length) throw new Error("No asset records were found below the header row.");
      setDraftRows(rows);
      toast.success(String(rows.length) + " asset record" + (rows.length === 1 ? "" : "s") + " loaded from " + file.name + ".");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to read the uploaded file.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
      if (dialogFileRef.current) dialogFileRef.current.value = "";
    }
  }

  return (
    <AppShell
      title="Asset Management"
      description="Maintain asset categories, asset registers and lifecycle status"
      actions={<Button className="gap-2" onClick={() => setShowAdd(true)}><Plus className="size-4" />Add Asset</Button>}
    >
      <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-border">
        <div className="border-b-2 border-primary px-3 py-2 text-sm font-semibold text-primary">Asset Category</div>
      </div>

      <SectionCard title="Asset Category" description="Upload an Excel/CSV asset register and maintain each asset individually.">
        <div className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="asset-category-filter">Asset Category</Label>
              <Input id="asset-category-filter" list="asset-category-options" placeholder="Select or enter category" value={category} onChange={(event) => setCategory(event.target.value)} />
              <datalist id="asset-category-options">{categories.map((item) => <option key={item} value={item} />)}</datalist>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex items-end gap-2">
              <input ref={fileRef} type="file" className="hidden" accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void handleFile(event.target.files?.[0])} />
              <Button type="button" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}><Upload className="size-4" />Upload Excel / CSV</Button>
              {draftRows.length > 0 ? <Button type="button" className="gap-2" disabled={saveUploaded.isPending} onClick={() => saveUploaded.mutate()}><Save className="size-4" />{saveUploaded.isPending ? "Saving…" : "Save " + draftRows.length + " record" + (draftRows.length === 1 ? "" : "s")}</Button> : null}
            </div>
          </div>

          {draftRows.length > 0 ? (
            <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><FileSpreadsheet className="size-4" />{draftRows.length} uploaded record{draftRows.length === 1 ? "" : "s"} ready to save</div>
              <p className="mt-1 text-xs text-muted-foreground">New records will be created as Active with today’s date. Existing records are edited individually below.</p>
              <div className="mt-3 max-h-72 overflow-auto rounded-lg border bg-background">
                <AssetPreviewTable rows={draftRows} editable onChange={setDraftRows} />
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard className="mt-6" title="Asset Register" description={(records.data?.length ?? 0) + " saved asset record" + ((records.data?.length ?? 0) === 1 ? "" : "s")}>
        {records.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading asset records…</div>
        ) : records.error ? (
          <div className="p-6 text-sm text-destructive">{(records.error as Error).message}</div>
        ) : !records.data?.length ? (
          <EmptyState message="No asset records found. Use Add Asset to upload an Excel or CSV asset register." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead><tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3">Asset Category</th>
                {allColumns.map((column, index) => <th key={column + "-" + index} className="px-4 py-3 whitespace-nowrap">{column || "Column " + (index + 1)}</th>)}
                <th className="px-4 py-3">Asset Status</th><th className="px-4 py-3">Asset Status Date</th><th className="px-4 py-3 text-right">Edit</th>
              </tr></thead>
              <tbody>{records.data.map((record) => (
                <tr key={record.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{record.asset_category}</td>
                  {allColumns.map((column, index) => {
                    const sourceIndex = record.asset_data.columns.indexOf(column);
                    return <td key={record.id + "-" + index} className="max-w-[220px] px-4 py-3 truncate">{sourceIndex >= 0 ? displayValue(record.asset_data.values[sourceIndex]) : "—"}</td>;
                  })}
                  <td className="px-4 py-3"><span className={record.asset_status === "Active" ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700" : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"}>{record.asset_status}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap">{record.asset_status_date}</td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => setEditing(record)} aria-label="Edit asset"><Pencil className="size-4" /></Button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <AddAssetDialog open={showAdd} category={category} categories={categories} onCategoryChange={setCategory} pending={saveUploaded.isPending} onClose={() => setShowAdd(false)} onUpload={handleFile} fileRef={dialogFileRef} rows={draftRows} onRowsChange={setDraftRows} onSave={() => saveUploaded.mutate()} />
      <EditAssetDialog key={editing?.id ?? "none"} record={editing} pending={updateRecord.isPending} onClose={() => setEditing(null)} onSave={(payload) => updateRecord.mutate(payload)} />
    </AppShell>
  );
}

function AddAssetDialog({
  open, category, categories, onCategoryChange, pending, onClose, onUpload, fileRef, rows, onRowsChange, onSave,
}: {
  open: boolean; category: string; categories: string[]; onCategoryChange: (value: string) => void; pending: boolean; onClose: () => void;
  onUpload: (file?: File) => void; fileRef: React.RefObject<HTMLInputElement | null>; rows: DraftRow[]; onRowsChange: (rows: DraftRow[]) => void; onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader><DialogTitle>Add Asset</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Asset Category</Label>
            <Input list="asset-category-options-dialog" placeholder="Select or enter Asset Category" value={category} onChange={(event) => onCategoryChange(event.target.value)} />
            <datalist id="asset-category-options-dialog">{categories.map((item) => <option key={item} value={item} />)}</datalist>
          </div>
          <div className="rounded-xl border border-dashed p-5">
            <input ref={fileRef} type="file" className="hidden" accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void onUpload(event.target.files?.[0])} />
            <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}><Upload className="size-4" />Upload Excel / CSV</Button><span className="text-xs text-muted-foreground">All uploaded columns are retained in their original order.</span></div>
          </div>
          {rows.length ? <div className="overflow-auto rounded-lg border"><AssetPreviewTable rows={rows} editable onChange={onRowsChange} /></div> : <div className="rounded-lg bg-muted/40 p-6 text-center text-sm text-muted-foreground">Upload a file to preview the asset records before saving.</div>}
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="button" disabled={pending || !rows.length} onClick={onSave}>{pending ? "Saving…" : "Save Assets"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssetPreviewTable({
  rows,
  editable = false,
  onChange,
}: {
  rows: DraftRow[];
  editable?: boolean;
  onChange?: (rows: DraftRow[]) => void;
}) {
  const columns = rows[0]?.columns ?? [];

  function updateValue(rowIndex: number, columnIndex: number, value: string) {
    if (!onChange) return;
    onChange(rows.map((row, index) => {
      if (index !== rowIndex) return row;
      const values = [...row.values];
      values[columnIndex] = value;
      return { ...row, values };
    }));
  }

  return (
    <table className="w-full min-w-max text-sm">
      <thead><tr className="border-b border-border text-left text-muted-foreground">
        {columns.map((column, index) => <th key={column + "-" + index} className="px-3 py-2 whitespace-nowrap">{column || "Column " + (index + 1)}</th>)}
        <th className="px-3 py-2 whitespace-nowrap">Asset Status</th><th className="px-3 py-2 whitespace-nowrap">Asset Status Date</th>
      </tr></thead>
      <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-border last:border-0">
        {columns.map((_, columnIndex) => (
          <td key={columnIndex} className="px-3 py-2">
            {editable ? (
              <Input
                className="min-w-36"
                value={displayValue(row.values[columnIndex]) === "—" ? "" : displayValue(row.values[columnIndex])}
                onChange={(event) => updateValue(rowIndex, columnIndex, event.target.value)}
              />
            ) : displayValue(row.values[columnIndex])}
          </td>
        ))}
        <td className="px-3 py-2">Active</td><td className="px-3 py-2">{today()}</td>
      </tr>)}</tbody>
    </table>
  );
}

function EditAssetDialog({
  record, pending, onClose, onSave,
}: {
  record: AssetRecord | null; pending: boolean; onClose: () => void;
  onSave: (payload: { id: string; assetCategory: string; assetData: AssetData; assetStatus: AssetStatus; assetStatusDate: string }) => void;
}) {
  const [assetCategory, setAssetCategory] = useState(record?.asset_category ?? "");
  const [status, setStatus] = useState<AssetStatus>(record?.asset_status ?? "Active");
  const [statusDate, setStatusDate] = useState(record?.asset_status_date ?? today());
  const [values, setValues] = useState<unknown[]>(record?.asset_data.values ?? []);

  if (!record) return null;
  const currentRecord = record;

  function setValue(index: number, value: string) {
    setValues((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function save() {
    onSave({
      id: currentRecord.id,
      assetCategory,
      assetData: { columns: currentRecord.asset_data.columns, values },
      assetStatus: status,
      assetStatusDate: statusDate,
    });
  }

  return (
    <Dialog open={Boolean(record)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>Edit Asset</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2"><Label>Asset Category</Label><Input value={assetCategory} onChange={(event) => setAssetCategory(event.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {record.asset_data.columns.map((column, index) => <div key={column + "-" + index} className="space-y-2"><Label>{column || "Column " + (index + 1)}</Label><Input value={displayValue(values[index]) === "—" ? "" : displayValue(values[index])} onChange={(event) => setValue(index, event.target.value)} /></div>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Asset Status</Label><select value={status} onChange={(event) => setStatus(event.target.value as AssetStatus)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="Active">Active</option><option value="Retired">Retired</option></select></div>
            <div className="space-y-2"><Label>Asset Status Date</Label><Input type="date" value={statusDate} onChange={(event) => setStatusDate(event.target.value)} /><p className="text-xs text-muted-foreground">Use the activation date for Active assets or retirement date for Retired assets.</p></div>
          </div>
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="button" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save Changes"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
