import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
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
  DialogTrigger,
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
import { attendanceQuery, salariesQuery, staffQuery, type Staff } from "@/lib/api";

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

function StaffPage() {
  const qc = useQueryClient();
  const staff = useQuery(staffQuery);
  const attendance = useQuery(attendanceQuery);
  const salaries = useQuery(salariesQuery);

  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Staff | null>(null);

  const departments = useMemo(
    () => Array.from(new Set((staff.data ?? []).map((s) => s.department))).sort(),
    [staff.data],
  );

  const rows = (staff.data ?? []).filter((s) => {
    const needle = q.trim().toLowerCase();
    const match =
      !needle ||
      [s.full_name, s.employee_code, s.designation, s.phone ?? ""].some((v) =>
        v.toLowerCase().includes(needle),
      );
    return match && (dept === "all" || s.department === dept) && (status === "all" || s.status === status);
  });

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase.from("staff").insert(payload as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Staff member added");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["staff"] });
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

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    save.mutate({
      employee_code: String(f.get("employee_code")),
      full_name: String(f.get("full_name")),
      designation: String(f.get("designation")),
      department: String(f.get("department")),
      phone: String(f.get("phone") || ""),
      whatsapp: String(f.get("whatsapp") || ""),
      shift: String(f.get("shift")),
      monthly_salary: Number(f.get("monthly_salary") || 0),
      join_date: String(f.get("join_date") || "") || null,
      status: "active",
    });
  }

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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" /> Add staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add staff member</DialogTitle>
            </DialogHeader>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
              <Field name="employee_code" label="Employee code" required />
              <Field name="full_name" label="Full name" required />
              <Field name="designation" label="Designation" required />
              <Field name="department" label="Department" required />
              <Field name="phone" label="Phone" />
              <Field name="whatsapp" label="WhatsApp" />
              <div className="space-y-2">
                <Label htmlFor="shift">Shift</Label>
                <select
                  id="shift"
                  name="shift"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="Morning"
                >
                  <option>Morning</option>
                  <option>Evening</option>
                  <option>Night</option>
                </select>
              </div>
              <Field name="monthly_salary" label="Monthly salary" type="number" />
              <Field name="join_date" label="Join date" type="date" />
              <DialogFooter className="sm:col-span-2">
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save staff member"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                      <TableHead>Shift</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.employee_code}</TableCell>
                        <TableCell className="font-medium">{s.full_name}</TableCell>
                        <TableCell>{s.designation}</TableCell>
                        <TableCell>{s.department}</TableCell>
                        <TableCell>{s.shift}</TableCell>
                        <TableCell>{s.phone ?? "—"}</TableCell>
                        <TableCell>{money(s.monthly_salary)}</TableCell>
                        <TableCell>
                          <StatusBadge value={s.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelected(s)}>
                            View
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

        <TabsContent value="attendance" className="mt-4">
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

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.full_name}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Employee code" value={selected.employee_code} />
              <Info label="Designation" value={selected.designation} />
              <Info label="Department" value={selected.department} />
              <Info label="Shift" value={selected.shift} />
              <Info label="Phone" value={selected.phone ?? "—"} />
              <Info label="WhatsApp" value={selected.whatsapp ?? "—"} />
              <Info label="Joined" value={selected.join_date ?? "—"} />
              <Info label="Salary" value={money(selected.monthly_salary)} />
              <Info label="Address" value={selected.address ?? "—"} />
              <Info label="Status" value={selected.status} />
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
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
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}
