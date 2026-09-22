import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, SectionCard, StatusBadge } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { DEPARTMENTS, facilityTasksQuery, staffQuery, type FacilityTask, type Staff } from "@/lib/api";

const TASK_TYPES = ["Regular", "Occasional"] as const;
const STATUSES = ["Started", "In-Progress", "Completed", "Aborted"] as const;
const FREQUENCIES = ["Daily", "Weekly", "Monthly", "Quarterly", "Half Yearly", "Full Year"] as const;

async function requireTab() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw redirect({ to: "/auth" });
  const { data: admin } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (admin) return;
  const { data: permission } = await supabase.from("user_tab_permissions").select("can_view").eq("user_id", user.id).eq("tab_key", "facility_management").maybeSingle();
  if (!permission?.can_view) throw redirect({ to: "/dashboard" });
}

export const Route = createFileRoute("/_authenticated/facility-management")({
  head: () => ({ meta: [{ title: "Facility Management — Indus Anantya Apartment" }] }),
  beforeLoad: requireTab,
  component: FacilityManagementPage,
});

function FacilityManagementPage() {
  const qc = useQueryClient();
  const staff = useQuery(staffQuery);
  const tasks = useQuery(facilityTasksQuery);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [editing, setEditing] = useState<FacilityTask | null | undefined>(undefined);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (tasks.data ?? []).filter((task) => {
      const values = [
        task.task_name,
        task.task_type,
        task.assigned_department ?? "",
        task.staff?.full_name ?? "",
        task.staff?.employee_code ?? "",
        task.task_description ?? "",
        task.status,
        task.frequency ?? "",
      ];
      return (!q || values.some((value) => value.toLowerCase().includes(q)))
        && (typeFilter === "all" || task.task_type === typeFilter)
        && (statusFilter === "all" || task.status === statusFilter)
        && (departmentFilter === "all" || task.assigned_department === departmentFilter);
    });
  }, [departmentFilter, search, statusFilter, tasks.data, typeFilter]);

  const save = useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Record<string, unknown> }) => {
      const result = id
        ? await supabase.from("facility_management_tasks").update(payload as never).eq("id", id)
        : await supabase.from("facility_management_tasks").insert(payload as never);
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      toast.success("Facility task saved");
      setEditing(undefined);
      qc.invalidateQueries({ queryKey: ["facility_tasks"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("facility_management_tasks").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Facility task deleted");
      qc.invalidateQueries({ queryKey: ["facility_tasks"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeCount = rows.filter((r) => r.status === "Started" || r.status === "In-Progress").length;
  const completedCount = rows.filter((r) => r.status === "Completed").length;

  return (
    <AppShell
      title="Facility Management"
      description="Plan, assign and track facility tasks"
      actions={<Button className="gap-2" onClick={() => setEditing(null)}><Plus className="size-4" />Add Task</Button>}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Tasks shown</p><p className="mt-1 text-2xl font-semibold">{rows.length}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Started / In-Progress</p><p className="mt-1 text-2xl font-semibold">{activeCount}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="mt-1 text-2xl font-semibold">{completedCount}</p></div>
      </div>

      <SectionCard className="mt-6" title="Task filters">
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search task, staff, department..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger><SelectValue placeholder="Task type" /></SelectTrigger><SelectContent><SelectItem value="all">All task types</SelectItem>{TASK_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}><SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger><SelectContent><SelectItem value="all">All departments</SelectItem>{Array.from(new Set([...DEPARTMENTS, ...(staff.data ?? []).map((s) => s.department)])).sort().map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
        </div>
      </SectionCard>

      <SectionCard className="mt-6">
        {rows.length === 0 ? <EmptyState message="No facility tasks found." /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3">Task</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Assigned Staff</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Start</th><th className="px-4 py-3">Expected End</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Frequency</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody>{rows.map((task) => <tr key={task.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3"><div className="font-medium">{task.task_name}</div><div className="max-w-xs truncate text-xs text-muted-foreground">{task.task_description ?? "—"}</div></td>
              <td className="px-4 py-3">{task.task_type}</td><td className="px-4 py-3">{task.staff ? <><div>{task.staff.full_name}</div><div className="text-xs text-muted-foreground">{task.staff.employee_code}</div></> : "—"}</td>
              <td className="px-4 py-3">{task.assigned_department ?? "—"}</td><td className="px-4 py-3 whitespace-nowrap">{task.task_start_date}</td><td className="px-4 py-3 whitespace-nowrap">{task.expected_end_date ?? "—"}</td>
              <td className="px-4 py-3"><StatusBadge value={task.status} /></td><td className="px-4 py-3">{task.frequency ?? "—"}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap"><Button variant="ghost" size="icon" onClick={() => setEditing(task)}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm("Delete this facility task?")) remove.mutate(task.id); }}><Trash2 className="size-4" /></Button></td>
            </tr>)}</tbody>
          </table></div>
        )}
      </SectionCard>

      <TaskDialog open={editing !== undefined} task={editing ?? null} staff={staff.data ?? []} pending={save.isPending} onClose={() => setEditing(undefined)} onSave={(payload) => save.mutate(editing?.id ? { id: editing.id, payload } : { payload })} />
    </AppShell>
  );
}

function TaskDialog({ open, task, staff, pending, onClose, onSave }: { open: boolean; task: FacilityTask | null; staff: Staff[]; pending: boolean; onClose: () => void; onSave: (payload: Record<string, unknown>) => void }) {
  const [taskType, setTaskType] = useState<"Regular" | "Occasional">(task?.task_type ?? "Regular");
  const [staffId, setStaffId] = useState(task?.assigned_staff_id ?? "none");
  const [department, setDepartment] = useState(task?.assigned_department ?? "none");
  const [status, setStatus] = useState<FacilityTask["status"]>(task?.status ?? "Started");
  const [frequency, setFrequency] = useState(task?.frequency ?? "none");

  const filteredStaff = useMemo(() => staff.filter((s) => s.status === "active" && (department === "none" || s.department === department)), [department, staff]);

  function changeDepartment(value: string) {
    setDepartment(value);
    if (staffId !== "none" && !staff.some((s) => s.id === staffId && s.department === value)) setStaffId("none");
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("task_name") ?? "").trim();
    const start = String(f.get("task_start_date") ?? "");
    const end = String(f.get("expected_end_date") ?? "") || null;
    if (!name || !start) { toast.error("Task Name and Task Start date are required."); return; }
    if (end && end < start) { toast.error("Expected End date cannot be before Task Start date."); return; }
    if (taskType === "Regular" && frequency === "none") { toast.error("Select a frequency for a Regular task."); return; }
    onSave({
      task_name: name,
      task_type: taskType,
      assigned_staff_id: staffId === "none" ? null : staffId,
      assigned_department: department === "none" ? null : department,
      task_description: String(f.get("task_description") ?? "").trim() || null,
      task_start_date: start,
      expected_end_date: end,
      status,
      frequency: frequency === "none" ? null : frequency,
    });
  }

  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{task ? "Edit Facility Task" : "Add Facility Task"}</DialogTitle></DialogHeader>
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
      <Field name="task_name" label="Task Name" required defaultValue={task?.task_name ?? ""} />
      <div className="space-y-2"><Label>Task Type</Label><select value={taskType} onChange={(e) => setTaskType(e.target.value as "Regular" | "Occasional")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{TASK_TYPES.map((v) => <option key={v}>{v}</option>)}</select></div>
      <div className="space-y-2"><Label>Assigned Department</Label><select value={department} onChange={(e) => changeDepartment(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="none">Not assigned</option>{Array.from(new Set([...DEPARTMENTS, ...staff.map((s) => s.department)])).sort().map((v) => <option key={v}>{v}</option>)}</select></div>
      <div className="space-y-2"><Label>Assigned Staff</Label><select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="none">Not assigned</option>{filteredStaff.map((s) => <option key={s.id} value={s.id}>{s.full_name} · {s.employee_code}</option>)}</select></div>
      <div className="sm:col-span-2 space-y-2"><Label htmlFor="task_description">Task Description</Label><textarea id="task_description" name="task_description" rows={3} defaultValue={task?.task_description ?? ""} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
      <Field name="task_start_date" label="Task Start date" type="date" required defaultValue={task?.task_start_date ?? ""} />
      <Field name="expected_end_date" label="Expected End date" type="date" defaultValue={task?.expected_end_date ?? ""} />
      <div className="space-y-2"><Label>Status</Label><select value={status} onChange={(e) => setStatus(e.target.value as FacilityTask["status"])} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{STATUSES.map((v) => <option key={v}>{v}</option>)}</select></div>
      <div className="space-y-2"><Label>Frequency</Label><select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="none">{taskType === "Occasional" ? "Not applicable" : "Select frequency"}</option>{FREQUENCIES.map((v) => <option key={v}>{v}</option>)}</select></div>
      <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save Task"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}

function Field({ name, label, type = "text", required, defaultValue }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} required={required} defaultValue={defaultValue} /></div>;
}
