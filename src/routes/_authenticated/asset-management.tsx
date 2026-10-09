import { useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, FileSpreadsheet, Pencil, Plus, Save, Upload } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { AppShell } from "@/components/AppShell";
import { SectionCard, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { parseAssetMatrix } from "@/lib/asset-import";

export const Route = createFileRoute("/_authenticated/asset-management")({
  head: () => ({ meta: [
    { title: "Asset Management — Indus Anantya Apartment" },
    { name: "description", content: "Manage apartment assets, import asset registers, and track lifecycle status." },
    { property: "og:title", content: "Asset Management — Indus Anantya Apartment" },
    { property: "og:description", content: "Manage apartment assets and track their lifecycle status." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AssetManagementPage,
});

type AssetStatus = "Active" | "Retired/In-Active";
type AssetData = { columns: string[]; values: unknown[] };
type AssetRecord = {
  id: string;
  asset_id: string;
  asset_category: string;
  asset_data: AssetData;
  asset_status: AssetStatus;
  asset_status_date: string;
  created_at: string;
  updated_at: string;
};
type DraftRow = {
  draftId: string;
  assetId: string;
  columns: string[];
  values: unknown[];
  assetStatus: AssetStatus;
  assetStatusDate: string;
  editing: boolean;
};
type EditRow = {
  assetCategory: string;
  columns: string[];
  values: unknown[];
  assetStatus: AssetStatus;
  assetStatusDate: string;
};

const today = () => new Date().toISOString().slice(0, 10);

function AssetManagementPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogFileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("");
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingRows, setEditingRows] = useState<Record<string, EditRow>>({});
  const [retirementRequest, setRetirementRequest] = useState<{ id: string; draft: EditRow } | null>(null);

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

  const insertRows = useMutation({
    mutationFn: async (rows: DraftRow[]) => {
      if (!category.trim()) throw new Error("Asset Category is required.");
      if (!rows.length) throw new Error("There are no asset rows to save.");

      const db = supabase as any;
      const payload = rows.map((row) => ({
        asset_category: category.trim(),
        asset_data: { columns: row.columns, values: row.values },
        asset_status: row.assetStatus,
        asset_status_date: row.assetStatusDate,
      }));
      const { error } = await db.from("asset_records").insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, rows) => {
      toast.success(rows.length + " asset record" + (rows.length === 1 ? "" : "s") + " saved.");
      setDraftRows((current) => current.filter((row) => !rows.some((saved) => saved.draftId === row.draftId)));
      if (rows.length === draftRows.length) setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ["asset_records"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateRecord = useMutation({
    mutationFn: async ({ id, draft }: { id: string; draft: EditRow }) => {
      if (!draft.assetCategory.trim()) throw new Error("Asset Category is required.");
      if (!draft.assetStatusDate) throw new Error("Asset Status Date is required.");

      const db = supabase as any;
      const { error } = await db.from("asset_records").update({
        asset_category: draft.assetCategory.trim(),
        asset_data: { columns: draft.columns, values: draft.values },
        asset_status: draft.assetStatus,
        asset_status_date: draft.assetStatusDate,
      }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      toast.success(variables.draft.assetStatus === "Retired/In-Active" ? "Asset retired and permanently locked." : "Asset record saved.");
      setEditingRows((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      setRetirementRequest(null);
      queryClient.invalidateQueries({ queryKey: ["asset_records"] });
    },
    onError: (error: Error) => {
      setRetirementRequest(null);
      toast.error(error.message);
    },
  });

  async function handleFile(file?: File) {
    if (!file) return;
    const extension = file.name.toLowerCase().split(".").pop();
    if (!extension || !["xlsx", "xls", "csv"].includes(extension)) {
      toast.error("Only Excel (.xlsx/.xls) or CSV (.csv) files are supported.");
      return;
    }

    setUploading(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("The uploaded file does not contain a worksheet.");
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) throw new Error("The uploaded worksheet could not be read.");

      const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "", raw: false });
      const rows = parseAssetMatrix(matrix).map((data) => ({
          draftId: crypto.randomUUID(),
          assetId: "Assigned on save",
          ...data,
          assetStatus: "Active" as AssetStatus,
          assetStatusDate: today(),
          editing: true,
        }));

      setDraftRows((current) => [...current, ...rows]);
      toast.success(rows.length + " asset record" + (rows.length === 1 ? "" : "s") + " loaded from " + file.name + ".");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to read the uploaded file.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (dialogFileRef.current) dialogFileRef.current.value = "";
    }
  }

  function startEdit(record: AssetRecord) {
    if (record.asset_status !== "Active") return;
    setEditingRows((current) => ({
      ...current,
      [record.id]: {
        assetCategory: record.asset_category,
        columns: [...record.asset_data.columns],
        values: [...record.asset_data.values],
        assetStatus: record.asset_status,
        assetStatusDate: record.asset_status_date,
      },
    }));
  }

  function updateEdit(id: string, patch: Partial<EditRow>) {
    setEditingRows((current) => {
      const existing = current[id];
      if (!existing) return current;
      return { ...current, [id]: { ...existing, ...patch } };
    });
  }

  function updateEditValue(id: string, index: number, value: string) {
    const draft = editingRows[id];
    if (!draft) return;
    const values = [...draft.values];
    values[index] = value;
    updateEdit(id, { values });
  }

  function selectStatus(id: string, status: AssetStatus) {
    const draft = editingRows[id];
    if (!draft) return;
    if (status === "Retired/In-Active" && draft.assetStatus !== "Retired/In-Active") {
      setRetirementRequest({ id, draft: { ...draft, assetStatus: "Retired/In-Active" } });
      return;
    }
    updateEdit(id, { assetStatus: status });
  }

  function confirmRetirement() {
    if (!retirementRequest) return;
    updateEdit(retirementRequest.id, retirementRequest.draft);
    updateRecord.mutate({ id: retirementRequest.id, draft: retirementRequest.draft });
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
              <Button type="button" variant="outline" className="gap-2" disabled={uploading} onClick={() => fileRef.current?.click()}><Upload className="size-4" />{uploading ? "Reading file…" : "Upload Excel / CSV"}</Button>
              {draftRows.length > 0 ? <Button type="button" className="gap-2" disabled={insertRows.isPending || !category.trim()} onClick={() => insertRows.mutate(draftRows)}><Save className="size-4" />{insertRows.isPending ? "Saving…" : "Save All " + draftRows.length}</Button> : null}
            </div>
          </div>

          {draftRows.length > 0 ? (
            <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><FileSpreadsheet className="size-4" />{draftRows.length} uploaded record{draftRows.length === 1 ? "" : "s"} ready to save</div>
              <p className="mt-1 text-xs text-muted-foreground">Every row receives a unique Asset ID. Edit individual rows before saving, or use Save All.</p>
              <div className="mt-3 max-h-96 overflow-auto rounded-lg border bg-background">
                <DraftTable rows={draftRows} onRowsChange={setDraftRows} onSaveRow={(row) => insertRows.mutate([row])} pending={insertRows.isPending} />
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
          <EmptyState message="No asset records found." />
        ) : (
          <AssetRegister
            records={records.data}
            editingRows={editingRows}
            onEdit={startEdit}
            onUpdate={updateEdit}
            onUpdateValue={updateEditValue}
            onStatusChange={selectStatus}
            onSave={(id) => {
              const draft = editingRows[id];
              if (draft) updateRecord.mutate({ id, draft });
            }}
            pending={updateRecord.isPending}
          />
        )}
      </SectionCard>

      <AddAssetDialog
        open={showAdd}
        category={category}
        categories={categories}
        onCategoryChange={setCategory}
        pending={insertRows.isPending || uploading}
        onClose={() => setShowAdd(false)}
        onUpload={handleFile}
        fileRef={dialogFileRef}
        rows={draftRows}
        onRowsChange={setDraftRows}
        onSave={() => insertRows.mutate(draftRows)}
        onSaveRow={(row) => insertRows.mutate([row])}
      />

      <AlertDialog open={Boolean(retirementRequest)} onOpenChange={(open) => !open && setRetirementRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retire asset?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to retire this asset? Once retired, it cannot be made active again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRetirement}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function AddAssetDialog({
  open, category, categories, onCategoryChange, pending, onClose, onUpload, fileRef, rows, onRowsChange, onSave, onSaveRow,
}: {
  open: boolean;
  category: string;
  categories: string[];
  onCategoryChange: (value: string) => void;
  pending: boolean;
  onClose: () => void;
  onUpload: (file?: File) => void;
  fileRef: RefObject<HTMLInputElement | null>;
  rows: DraftRow[];
  onRowsChange: (rows: DraftRow[]) => void;
  onSave: () => void;
  onSaveRow: (row: DraftRow) => void;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [quantity, setQuantity] = useState("1");

  function addManualRow() {
    if (!category.trim() || !name.trim()) return;
    onRowsChange([...rows, {
      draftId: crypto.randomUUID(), assetId: "Assigned on save",
      columns: ["Name", "Location", "Quantity"], values: [name.trim(), location.trim(), quantity],
      assetStatus: "Active", assetStatusDate: today(), editing: true,
    }]);
    setName(""); setLocation(""); setQuantity("1");
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-7xl">
        <DialogHeader><DialogTitle>Add Asset</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="new-asset-category">Asset Category *</Label>
            <Input id="new-asset-category" list="asset-category-options-dialog" placeholder="Select or enter Asset Category" value={category} onChange={(event) => onCategoryChange(event.target.value)} />
            <datalist id="asset-category-options-dialog">{categories.map((item) => <option key={item} value={item} />)}</datalist>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2"><Label htmlFor="new-asset-name">Asset Name *</Label><Input id="new-asset-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="new-asset-location">Location</Label><Input id="new-asset-location" value={location} onChange={(event) => setLocation(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="new-asset-quantity">Quantity</Label><Input id="new-asset-quantity" type="number" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div>
          </div>
          <div><Button type="button" variant="outline" disabled={pending || !category.trim() || !name.trim()} onClick={addManualRow}><Plus className="mr-2 size-4" />Add row</Button></div>
          <div className="rounded-xl border border-dashed p-5">
            <input ref={fileRef} type="file" className="hidden" accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void onUpload(event.target.files?.[0])} />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" disabled={pending} className="gap-2" onClick={() => fileRef.current?.click()}><Upload className="size-4" />Upload Excel / CSV</Button>
              <span className="text-xs text-muted-foreground">All uploaded columns are retained in their original order.</span>
            </div>
          </div>
          {rows.length ? <div className="overflow-auto rounded-lg border"><DraftTable rows={rows} onRowsChange={onRowsChange} onSaveRow={onSaveRow} pending={pending} /></div> : <div className="rounded-lg bg-muted/40 p-6 text-center text-sm text-muted-foreground">Upload a file to preview the asset records before saving.</div>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={pending || !rows.length || !category.trim()} onClick={onSave}>{pending ? "Saving…" : "Save All " + rows.length}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DraftTable({ rows, onRowsChange, onSaveRow, pending }: {
  rows: DraftRow[];
  onRowsChange: (rows: DraftRow[]) => void;
  onSaveRow: (row: DraftRow) => void;
  pending: boolean;
}) {
  const columns = Array.from(new Set(rows.flatMap((row) => row.columns)));

  function patch(index: number, change: Partial<DraftRow>) {
    onRowsChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...change } : row));
  }

  function patchValue(rowIndex: number, columnIndex: number, value: string) {
    const row = rows[rowIndex];
    if (!row) return;
    const values = [...row.values];
    values[columnIndex] = value;
    patch(rowIndex, { values });
  }

  return (
    <table className="w-full min-w-[1250px] text-sm">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="px-3 py-2">Asset ID</th>
          {columns.map((column, index) => <th key={index} className="px-3 py-2 whitespace-nowrap">{column || "Column " + (index + 1)}</th>)}
          <th className="px-3 py-2">Asset Status</th>
          <th className="px-3 py-2">Asset Status Date</th>
          <th className="px-3 py-2">Save</th>
          <th className="px-3 py-2">Edit</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={row.draftId} className="border-b border-border last:border-0">
            <td className="px-3 py-2 font-medium whitespace-nowrap">{row.assetId}</td>
            {columns.map((column) => {
              const columnIndex = row.columns.indexOf(column);
              if (columnIndex < 0) return <td key={column} className="px-3 py-2">—</td>;
              return (
              <td key={columnIndex} className="px-3 py-2">
                {row.editing ? <Input className="min-w-36" value={displayValue(row.values[columnIndex]) === "—" ? "" : displayValue(row.values[columnIndex])} onChange={(event) => patchValue(rowIndex, columnIndex, event.target.value)} /> : <span>{displayValue(row.values[columnIndex])}</span>}
              </td>
              );
            })}
            <td className="px-3 py-2">
              {row.editing ? (
                <select value={row.assetStatus} onChange={(event) => patch(rowIndex, { assetStatus: event.target.value as AssetStatus })} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="Active">Active</option>
                  <option value="Retired/In-Active">Retired/In-Active</option>
                </select>
              ) : row.assetStatus}
            </td>
            <td className="px-3 py-2 whitespace-nowrap">
              {row.editing ? <DatePicker value={row.assetStatusDate} onChange={(value) => patch(rowIndex, { assetStatusDate: value })} /> : row.assetStatusDate}
            </td>
            <td className="px-3 py-2">
              <Button size="sm" disabled={pending} onClick={() => onSaveRow(row)}><Save className="mr-1 size-4" />Save</Button>
            </td>
            <td className="px-3 py-2">
              <Button size="sm" variant="outline" onClick={() => patch(rowIndex, { editing: !row.editing })}><Pencil className="mr-1 size-4" />{row.editing ? "Done" : "Edit"}</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AssetRegister({ records, editingRows, onEdit, onUpdate, onUpdateValue, onStatusChange, onSave, pending }: {
  records: AssetRecord[];
  editingRows: Record<string, EditRow>;
  onEdit: (record: AssetRecord) => void;
  onUpdate: (id: string, patch: Partial<EditRow>) => void;
  onUpdateValue: (id: string, index: number, value: string) => void;
  onStatusChange: (id: string, status: AssetStatus) => void;
  onSave: (id: string) => void;
  pending: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1250px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-4 py-3">Asset ID</th>
            <th className="px-4 py-3">Asset Category</th>
            <th className="px-4 py-3">Imported Asset Data</th>
            <th className="px-4 py-3">Asset Status</th>
            <th className="px-4 py-3">Asset Status Date</th>
            <th className="px-4 py-3">Save</th>
            <th className="px-4 py-3">Edit</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const draft = editingRows[record.id];
            const retired = record.asset_status === "Retired/In-Active";
            const columns = draft?.columns ?? record.asset_data.columns;
            const values = draft?.values ?? record.asset_data.values;
            return (
              <tr key={record.id} className={"border-b border-border last:border-0 " + (retired ? "bg-muted/60 text-muted-foreground" : "")}>
                <td className="px-4 py-3 font-medium whitespace-nowrap">{record.asset_id}</td>
                <td className="px-4 py-3 align-top">
                  {draft ? <Input value={draft.assetCategory} onChange={(event) => onUpdate(record.id, { assetCategory: event.target.value })} /> : record.asset_category}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="min-w-[420px] grid gap-2 sm:grid-cols-2">
                    {columns.map((column, index) => (
                      <div key={column + "-" + index} className="grid grid-cols-[minmax(100px,1fr)_minmax(150px,2fr)] items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{column || "Column " + (index + 1)}</span>
                        {draft ? <Input value={displayValue(values[index]) === "—" ? "" : displayValue(values[index])} onChange={(event) => onUpdateValue(record.id, index, event.target.value)} /> : <span className="truncate">{displayValue(values[index])}</span>}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  {draft ? (
                    <select value={draft.assetStatus} onChange={(event) => onStatusChange(record.id, event.target.value as AssetStatus)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="Active">Active</option>
                      <option value="Retired/In-Active">Retired/In-Active</option>
                    </select>
                  ) : (
                    <span className={retired ? "rounded-full bg-muted px-2.5 py-1 text-xs font-medium" : "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"}>{record.asset_status}</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top whitespace-nowrap">
                  {draft ? <DatePicker value={draft.assetStatusDate} onChange={(value) => onUpdate(record.id, { assetStatusDate: value })} /> : record.asset_status_date}
                </td>
                <td className="px-4 py-3 align-top">
                  <Button size="sm" disabled={retired || !draft || pending} onClick={() => onSave(record.id)}><Save className="mr-1 size-4" />Save</Button>
                </td>
                <td className="px-4 py-3 align-top">
                  <Button size="sm" variant="outline" disabled={retired || pending} onClick={() => onEdit(record)}><Pencil className="mr-1 size-4" />Edit</Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DatePicker({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const selected = value ? new Date(value + "T00:00:00") : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} className="min-w-[180px] justify-start gap-2 font-normal">
          <CalendarDays className="size-4" />{selected ? format(selected, "dd MMM yyyy") : "Select date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={selected} onSelect={(date) => date && onChange(format(date, "yyyy-MM-dd"))} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
