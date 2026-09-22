import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SectionCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  attendanceQuery,
  salariesQuery,
  staffQuery,
  staffDocsQuery,
  contractorsQuery,
  DEPARTMENTS,
  type Staff,
} from "@/lib/api";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Staff — Indus Anantya Apartment" },
      {
        name: "description",
        content: "Staff records, daily attendance and monthly salary reports for the community team.",
      },
      { property: "og:title", content: "Staff — Indus Anantya Apartment" },
      { property: "og:description", content: "Staff records, attendance and salary reports." },
    ],
  }),
  component: StaffPage,
});

const money = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;
const SHIFTS = ["Morning", "Evening", "Night"];

function StaffPage() {
  const qc = useQueryClient();
  const staff = useQuery(staffQuery);
  const attendance = useQuery(attendanceQuery);
  const salaries = useQuery(salariesQuery);
  const contractors = useQuery(contractorsQuery);

  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Staff | null | undefined>(undefined); // undefined = closed, null = new
  const [selected, setSelected] = useState<Staff | null>(null);

  const departments = useMemo(
    () =>
      Array.from(
        new Set([...DEPARTMENTS, ...(staff.data ?? []).map((s) => s.department)]),
      ).sort(),
    [staff.data],
  );

  const rows = (staff.data ?? []).filter((s) => {
    const needle = q.trim().toLowerCase();
    const match =
      !needle ||
      [s.full_name, s.employee_code, s.designation, s.phone ?? "", s.contractors?.company_name ?? ""].some((v) =>
        v.toLowerCase().includes(needle),
      );
    return match && (dept === "all" || s.department === dept) && (status === "all" || s.status === status);
  });

  const save = useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Record<string, unknown> }) => {
      const { error } = id
        ? await supabase.from("staff").update(payload as never).eq("id", id)
        : await supabase.from("staff").insert(payload as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Staff record saved");
      setEditing(undefined);
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["contractors"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Staff member deleted");
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["salaries"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markAttendance = useMutation({
    mutationFn: async ({ staffId, value }: { staffId: string; value: string }) => {
      const { error } = await supabase
        .from("staff_attendance")
        .upsert(
          { staff_id: staffId, attendance_date: new Date().toISOString().slice(0, 10), status: value } as never,
          { onConflict: "staff_id,attendance_date" },
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Attendance updated");
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editAttendance = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("staff_attendance").update(patch as never).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Attendance record updated");
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAttendance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff_attendance").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Attendance record deleted");
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAtt = new Map(
    (attendance.data ?? [])
      .filter((a) => a.attendance_date === todayStr)
      .map((a) => [a.staff_id, a.status]),
  );

  return (
    <AppShell
      title="Staff"
      description="Personal records, attendance and salary"
      actions={
        <Button className="gap-2" onClick={() => setEditing(null)}>
          <Plus className="size-4" /> Add staff
        </Button>
      }
    >
      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, code, role or phone"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SectionCard>
            {rows.length === 0 ? (
              <EmptyState message="No staff match your search." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Staff type</TableHead>
                      <TableHead>Contractor</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.employee_code}</TableCell>
                        <TableCell className="font-medium">{s.full_name}</TableCell>
                        <TableCell>{s.designation}</TableCell>
                        <TableCell>{s.department}</TableCell>
                        <TableCell>{s.staff_type}</TableCell>
                        <TableCell>{s.contractors?.company_name ?? "—"}</TableCell>
                        <TableCell>{s.shift}</TableCell>
                        <TableCell>{s.phone ?? "—"}</TableCell>
                        <TableCell>{money(s.monthly_salary)}</TableCell>
                        <TableCell>
                          <StatusBadge value={s.status} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelected(s)}>
                            View
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing(s)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Delete ${s.full_name}? This also removes their attendance and salary records.`))
                                removeStaff.mutate(s.id);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4 space-y-4">
          <SectionCard title="Today's attendance" description={todayStr}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Today</TableHead>
                    <TableHead className="text-right">Mark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(staff.data ?? []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell>{s.department}</TableCell>
                      <TableCell>
                        <StatusBadge value={todayAtt.get(s.id) ?? "not marked"} />
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        {["present", "absent", "leave"].map((v) => (
                          <Button
                            key={v}
                            size="sm"
                            variant={todayAtt.get(s.id) === v ? "default" : "outline"}
                            onClick={() => markAttendance.mutate({ staffId: s.id, value: v })}
                          >
                            {v}
                          </Button>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>

          <SectionCard title="Attendance history" description="Edit or remove any past record">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>In</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(attendance.data ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap">{a.attendance_date}</TableCell>
                      <TableCell className="font-medium">{a.staff?.full_name ?? "—"}</TableCell>
                      <TableCell>{a.staff?.department ?? "—"}</TableCell>
                      <TableCell>
                        <select
                          value={a.status}
                          onChange={(e) =>
                            editAttendance.mutate({ id: a.id, patch: { status: e.target.value } })
                          }
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm capitalize"
                        >
                          {["present", "absent", "leave"].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>{a.check_in ?? "—"}</TableCell>
                      <TableCell>{a.check_out ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete attendance"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Delete this attendance record?")) removeAttendance.mutate(a.id);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="salary" className="mt-4">
          <SectionCard title="Salary records" description="Monthly payouts">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(salaries.data ?? []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.salary_month.slice(0, 7)}</TableCell>
                      <TableCell className="font-medium">{s.staff?.full_name ?? "—"}</TableCell>
                      <TableCell>{money(s.base_amount)}</TableCell>
                      <TableCell>{money(s.bonus)}</TableCell>
                      <TableCell>{money(s.deductions)}</TableCell>
                      <TableCell className="font-semibold">{money(s.net_amount)}</TableCell>
                      <TableCell>
                        <StatusBadge value={s.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <StaffFormDialog
        key={editing?.id ?? "new"}
        open={editing !== undefined}
        record={editing ?? null}
        contractors={contractors.data ?? []}
        pending={save.isPending}
        onClose={() => setEditing(undefined)}
        onSave={(payload) => save.mutate(editing?.id ? { id: editing.id, payload } : { payload })}
      />

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selected?.full_name}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-6">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Employee code" value={selected.employee_code} />
                <Info label="Designation" value={selected.designation} />
                <Info label="Department" value={selected.department} />
                <Info label="Staff type" value={selected.staff_type} />
                <Info label="Contractor" value={selected.contractors?.company_name ?? "—"} />
                <Info label="Shift" value={selected.shift} />
                <Info label="Phone" value={selected.phone ?? "—"} />
                <Info label="WhatsApp" value={selected.whatsapp ?? "—"} />
                <Info label="Joining date" value={selected.join_date ?? "—"} />
                <Info label="Relieving date" value={selected.relieving_date ?? "—"} />
                <Info label="Aadhaar number" value={selected.aadhaar_number ?? "—"} />
                <Info label="Salary" value={money(selected.monthly_salary)} />
                <Info label="Reference name" value={selected.reference_name ?? "—"} />
                <Info label="Reference phone" value={selected.reference_phone ?? "—"} />
                <Info label="Emergency contact" value={selected.emergency_contact ?? "—"} />
                <Info label="Status" value={selected.status} />
                <div className="col-span-2">
                  <Info label="Address" value={selected.address ?? "—"} />
                </div>
              </dl>
              <StaffDocuments staffId={selected.id} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function StaffDocuments({ staffId }: { staffId: string }) {
  const qc = useQueryClient();
  const docs = useQuery(staffDocsQuery(staffId));
  const [docType, setDocType] = useState("aadhaar");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    try {
      const path = `${staffId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const up = await supabase.storage.from("staff-documents").upload(path, file);
      if (up.error) throw new Error(up.error.message);
      const { error } = await supabase
        .from("staff_documents")
        .insert({ staff_id: staffId, doc_type: docType, file_name: file.name, file_path: path } as never);
      if (error) throw new Error(error.message);
      toast.success("Document uploaded");
      qc.invalidateQueries({ queryKey: ["staff_documents", staffId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function open(path: string) {
    const { data, error } = await supabase.storage.from("staff-documents").createSignedUrl(path, 120);
    if (error || !data) { toast.error(error?.message ?? "Could not open document"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function remove(id: string, path: string) {
    if (!confirm("Delete this document?")) return;
    await supabase.storage.from("staff-documents").remove([path]);
    const { error } = await supabase.from("staff_documents").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Document deleted");
    qc.invalidateQueries({ queryKey: ["staff_documents", staffId] });
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Documents
      </h3>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-2">
          <Label htmlFor="doc_type">Document type</Label>
          <select
            id="doc_type"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm capitalize"
          >
            <option value="aadhaar">Aadhaar</option>
            <option value="resume">Resume</option>
            <option value="other">Other (memo, certificate)</option>
          </select>
        </div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="size-4" /> {busy ? "Uploading…" : "Upload file"}
        </Button>
      </div>
      {(docs.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {(docs.data ?? []).map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <button
                type="button"
                onClick={() => void open(d.file_path)}
                className="flex min-w-0 items-center gap-2 text-left hover:underline"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{d.file_name}</span>
                <span className="shrink-0 text-xs capitalize text-muted-foreground">· {d.doc_type}</span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete document"
                className="text-destructive hover:text-destructive"
                onClick={() => void remove(d.id, d.file_path)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StaffFormDialog({
  open,
  record,
  contractors,
  pending,
  onClose,
  onSave,
}: {
  open: boolean;
  record: Staff | null;
  contractors: { id: string; company_name: string }[];
  pending: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const [staffType, setStaffType] = useState<"Permanent" | "Contractor">(record?.staff_type ?? "Permanent");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim();
    onSave({
      employee_code: str("employee_code") || `EMP-${Date.now().toString().slice(-6)}`,
      full_name: str("full_name"),
      designation: str("designation") || str("department"),
      department: str("department"),
      staff_type: str("staff_type") || "Permanent",
      contractor_id: str("staff_type") === "Contractor" ? (str("contractor_id") || null) : null,
      phone: str("phone").replace(/\D/g, ""),
      whatsapp: str("whatsapp").replace(/\D/g, "") || str("phone").replace(/\D/g, ""),
      phone_country_code: str("phone_country_code") || "+91",
      whatsapp_country_code: str("whatsapp_country_code") || str("phone_country_code") || "+91",
      shift: str("shift"),
      monthly_salary: Number(f.get("monthly_salary") || 0),
      join_date: str("join_date") || null,
      relieving_date: str("relieving_date") || null,
      aadhaar_number: str("aadhaar_number").replace(/\D/g, ""),
      address: str("address"),
      reference_name: str("reference_name"),
      reference_phone: str("reference_phone"),
      emergency_contact: str("emergency_contact"),
      status: str("status") || "active",
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{record ? `Edit ${record.full_name}` : "Add staff member"}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <Field name="full_name" label="Full name" required defaultValue={record?.full_name ?? ""} />
          <div className="space-y-2"><Label htmlFor="phone">Phone number <span className="text-destructive">*</span></Label><div className="flex gap-2"><select name="phone_country_code" defaultValue={record?.phone_country_code ?? "+91"} className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm"><option>+91</option><option>+1</option><option>+44</option><option>+65</option><option>+971</option></select><Input id="phone" name="phone" required inputMode="numeric" maxLength={10} pattern="[0-9]{10}" defaultValue={record?.phone ?? ""} /></div></div>
          <div className="space-y-2">
            <Label htmlFor="staff_type">Staff type</Label>
            <select
              id="staff_type"
              name="staff_type"
              value={staffType}
              onChange={(e) => setStaffType(e.target.value as "Permanent" | "Contractor")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="Permanent">Permanent</option>
              <option value="Contractor">Contractor</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractor_id">Contractor company</Label>
            <select
              id="contractor_id"
              name="contractor_id"
              required={staffType === "Contractor"}
              defaultValue={record?.contractor_id ?? ""}
              disabled={staffType !== "Contractor"}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select contractor company</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
            {contractors.length === 0 ? (
              <p className="text-xs text-muted-foreground">Create a contractor company in the Contractor tab first.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">
              Department <span className="text-destructive">*</span>
            </Label>
            <select
              id="department"
              name="department"
              required
              defaultValue={record?.department ?? ""}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="" disabled>
                Select department
              </option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <Field name="join_date" label="Joining date" type="date" required defaultValue={record?.join_date ?? ""} />
          <Field
            name="aadhaar_number"
            label="Aadhaar number"
            required
            defaultValue={record?.aadhaar_number ?? ""}
          />
          <Field name="relieving_date" label="Relieving date" type="date" defaultValue={record?.relieving_date ?? ""} />
          <div className="sm:col-span-2">
            <Field name="address" label="Address" required defaultValue={record?.address ?? ""} />
          </div>
          <Field
            name="reference_name"
            label="Reference name"
            required
            defaultValue={record?.reference_name ?? ""}
          />
          <Field
            name="reference_phone"
            label="Reference phone number"
            required
            defaultValue={record?.reference_phone ?? ""}
          />
          <Field
            name="emergency_contact"
            label="Emergency contact"
            required
            defaultValue={record?.emergency_contact ?? ""}
          />
          <Field name="employee_code" label="Employee code" defaultValue={record?.employee_code ?? ""} />
          <Field name="designation" label="Designation" defaultValue={record?.designation ?? ""} />
          <div className="space-y-2"><Label htmlFor="whatsapp">WhatsApp</Label><div className="flex gap-2"><select name="whatsapp_country_code" defaultValue={record?.whatsapp_country_code ?? "+91"} className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm"><option>+91</option><option>+1</option><option>+44</option><option>+65</option><option>+971</option></select><Input id="whatsapp" name="whatsapp" inputMode="numeric" maxLength={10} pattern="[0-9]{10}" defaultValue={record?.whatsapp ?? ""} /></div></div>
          <div className="space-y-2">
            <Label htmlFor="shift">Shift</Label>
            <select
              id="shift"
              name="shift"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={record?.shift ?? "Morning"}
            >
              {SHIFTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <Field
            name="monthly_salary"
            label="Monthly salary"
            type="number"
            defaultValue={record ? String(record.monthly_salary) : ""}
          />
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={record?.status ?? "active"}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save staff member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label} {required ? <span className="text-destructive">*</span> : null}
      </Label>
      <Input id={name} name={name} type={type} required={required} defaultValue={defaultValue} maxLength={name.includes("phone") || name.includes("contact") || name==="aadhaar_number" ? (name==="aadhaar_number" ? 12 : 10) : undefined} inputMode={name.includes("phone") || name.includes("contact") || name==="aadhaar_number" ? "numeric" : undefined} pattern={name==="aadhaar_number" ? "[0-9]{12}" : (name.includes("phone") || name.includes("contact") ? "[0-9]{10}" : undefined)} />
    </div>
  );
}
