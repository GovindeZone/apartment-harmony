import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Clock3, Search, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, SectionCard, StatCard, StatusBadge } from "@/components/ui-bits";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { attendanceQuery, staffQuery, type Attendance, type Staff } from "@/lib/api";

const SHIFT_OPTIONS = [
  "General Shift (9 AM - 6 PM)",
  "First Shift (2 PM - 10 PM)",
  "Second Shift (10 PM - 9 AM)",
] as const;

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — Indus Anantya Apartment" },
      { name: "description", content: "Daily and monthly staff attendance management." },
    ],
  }),
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });

    const { data: admin } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (admin) return;

    const { data: permission } = await supabase
      .from("user_tab_permissions")
      .select("can_view")
      .eq("user_id", user.id)
      .eq("tab_key", "attendance")
      .maybeSingle();

    if (!permission?.can_view) throw redirect({ to: "/dashboard" });
  },
  component: AttendancePage,
});

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "half_day_am_absent", label: "1/2 AM Absent" },
  { value: "half_day_pm_absent", label: "1/2 PM Absent" },
  { value: "leave", label: "Leave" },
  { value: "week_off", label: "Week Off" },
  { value: "festival_holiday", label: "Festival Holiday" },
  { value: "overtime", label: "Overtime" },
  { value: "comp_off", label: "Comp-Off" },
] as const;

const statusLabel = (value: string) =>
  STATUS_OPTIONS.find((item) => item.value === value)?.label ?? value;

const localDate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const monthBounds = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(year, monthNumber - 1, 1);
  const end = new Date(year, monthNumber, 0);
  return { start: localDate(start), end: localDate(end) };
};

const attendanceUnit = (status: string) => {
  if (status === "present") return 1;
  if (status === "half_day_am_absent" || status === "half_day_pm_absent") return 0.5;
  return 0;
};

function AttendancePage() {
  const qc = useQueryClient();
  const staff = useQuery(staffQuery);
  const attendance = useQuery(attendanceQuery);
  const today = localDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedShifts, setSelectedShifts] = useState<Record<string, string>>({});

  const monthlyAttendance = useQuery({
    queryKey: ["attendance-range", selectedMonth],
    queryFn: async () => {
      const { start, end } = monthBounds(selectedMonth);
      const { data, error } = await supabase
        .from("staff_attendance")
        .select("*, staff(full_name, employee_code, department)")
        .gte("attendance_date", start)
        .lte("attendance_date", end)
        .order("attendance_date", { ascending: false })
        .order("staff_id");
      if (error) throw new Error(error.message);
      return (data ?? []) as Attendance[];
    },
  });

  const saveAttendance = useMutation({
    mutationFn: async ({
      staffId,
      date,
      status,
      shift,
    }: {
      staffId: string;
      date: string;
      status: string;
      shift: string;
    }) => {
      const { error } = await supabase
        .from("staff_attendance")
        .upsert(
          { staff_id: staffId, attendance_date: date, status, shift } as never,
          { onConflict: "staff_id,attendance_date" },
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Attendance updated");
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["attendance-range"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const departments = useMemo(
    () =>
      Array.from(new Set((staff.data ?? []).map((item) => item.department).filter(Boolean))).sort(),
    [staff.data],
  );

  const staffRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (staff.data ?? []).filter((item) => {
      const matchesSearch =
        !needle ||
        [item.full_name, item.employee_code, item.designation, item.phone ?? ""].some((value) =>
          value.toLowerCase().includes(needle),
        );
      return matchesSearch && (department === "all" || item.department === department);
    });
  }, [department, query, staff.data]);

  const selectedDateRows = useMemo(
    () =>
      (attendance.data ?? []).filter(
        (item) =>
          item.attendance_date === selectedDate &&
          (department === "all" || item.staff?.department === department) &&
          (statusFilter === "all" || item.status === statusFilter) &&
          (!query.trim() ||
            [item.staff?.full_name ?? "", item.staff?.employee_code ?? ""].some((value) =>
              value.toLowerCase().includes(query.trim().toLowerCase()),
            )),
      ),
    [attendance.data, department, query, selectedDate, statusFilter],
  );

  const selectedDateMap = useMemo(
    () =>
      new Map(
        (attendance.data ?? [])
          .filter((item) => item.attendance_date === selectedDate)
          .map((item) => [item.staff_id, item]),
      ),
    [attendance.data, selectedDate],
  );

  const selectedDateStats = useMemo(() => {
    const rows = Array.from(selectedDateMap.values());
    return {
      present: rows.filter((row) => row.status === "present").length,
      halfDay: rows.filter(
        (row) => row.status === "half_day_am_absent" || row.status === "half_day_pm_absent",
      ).length,
      absent: rows.filter((row) => row.status === "absent").length,
      leave: rows.filter((row) => row.status === "leave").length,
      weekOff: rows.filter((row) => row.status === "week_off").length,
      festivalHoliday: rows.filter((row) => row.status === "festival_holiday").length,
      overtime: rows.filter((row) => row.status === "overtime").length,
      compOff: rows.filter((row) => row.status === "comp_off").length,
    };
  }, [selectedDateMap]);

  const departmentSummary = useMemo(() => {
    return departments
      .filter((item) => department === "all" || item === department)
      .map((item) => {
        const ids = new Set(
          (staff.data ?? [])
            .filter((member) => member.status === "active" && member.department === item)
            .map((member) => member.id),
        );
        const rows = Array.from(selectedDateMap.values()).filter((row) => ids.has(row.staff_id));
        return {
          department: item,
          total: ids.size,
          present: rows.filter((row) => row.status === "present").length,
          halfAM: rows.filter((row) => row.status === "half_day_am_absent").length,
          halfPM: rows.filter((row) => row.status === "half_day_pm_absent").length,
          absent: rows.filter((row) => row.status === "absent").length,
          leave: rows.filter((row) => row.status === "leave").length,
          weekOff: rows.filter((row) => row.status === "week_off").length,
          festivalHoliday: rows.filter((row) => row.status === "festival_holiday").length,
          overtime: rows.filter((row) => row.status === "overtime").length,
          compOff: rows.filter((row) => row.status === "comp_off").length,
          notMarked: Math.max(ids.size - rows.length, 0),
        };
      });
  }, [department, departments, selectedDateMap, staff.data]);

  const monthlySummary = useMemo(() => {
    const rows = monthlyAttendance.data ?? [];
    return staffRows.map((member) => {
      const memberRows = rows.filter((row) => row.staff_id === member.id);
      return {
        staff: member,
        present: memberRows.filter((row) => row.status === "present").length,
        halfAM: memberRows.filter((row) => row.status === "half_day_am_absent").length,
        halfPM: memberRows.filter((row) => row.status === "half_day_pm_absent").length,
        absent: memberRows.filter((row) => row.status === "absent").length,
        leave: memberRows.filter((row) => row.status === "leave").length,
        weekOff: memberRows.filter((row) => row.status === "week_off").length,
        festivalHoliday: memberRows.filter((row) => row.status === "festival_holiday").length,
        overtime: memberRows.filter((row) => row.status === "overtime").length,
        compOff: memberRows.filter((row) => row.status === "comp_off").length,
        recorded: memberRows.length,
        presentEquivalent: memberRows.reduce((sum, row) => sum + attendanceUnit(row.status), 0),
      };
    });
  }, [monthlyAttendance.data, staffRows]);

  const historyRows = useMemo(
    () =>
      (monthlyAttendance.data ?? []).filter(
        (row) =>
          (department === "all" || row.staff?.department === department) &&
          (statusFilter === "all" || row.status === statusFilter) &&
          (!query.trim() ||
            [row.staff?.full_name ?? "", row.staff?.employee_code ?? ""].some((value) =>
              value.toLowerCase().includes(query.trim().toLowerCase()),
            )),
      ),
    [department, monthlyAttendance.data, query, statusFilter],
  );

  return (
    <AppShell
      title="Attendance"
      description="Daily marking, department-wise attendance and monthly staff history"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Present" value={selectedDateStats.present} icon={CheckCircle2} tone="success" />
        <StatCard label="1/2 Day" value={selectedDateStats.halfDay} icon={Clock3} tone="warning" />
        <StatCard label="Absent" value={selectedDateStats.absent} icon={XCircle} tone="danger" />
        <StatCard label="Leave" value={selectedDateStats.leave} icon={CalendarDays} tone="warning" />
        <StatCard label="Week Off" value={selectedDateStats.weekOff} icon={Users} />
      </div>

      <SectionCard
        className="mt-6"
        title="Attendance controls"
        description="Choose the date to mark or review, then use the filters below."
      >
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Attendance date</label>
            <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Month for history</label>
            <Input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Search staff</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or employee code" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Department</label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        className="mt-6"
        title={`Mark attendance · ${selectedDate}`}
        description="1/2 AM Absent means absent in the morning and present in the afternoon; 1/2 PM Absent means the reverse. Week Off is not treated as absence."
      >
        {staffRows.length === 0 ? (
          <EmptyState message="No active staff match the selected filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Current status</th>
                  <th className="px-4 py-3">Shift</th>
                  <th className="px-4 py-3 text-right">Shift &amp; mark attendance</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.map((member) => {
                  const row = selectedDateMap.get(member.id);
                  const memberShift = SHIFT_OPTIONS.includes(member.shift as (typeof SHIFT_OPTIONS)[number]) ? member.shift : SHIFT_OPTIONS[0];
                  const selectedShift = selectedShifts[member.id] ?? row?.shift ?? memberShift;
                  return (
                    <tr key={member.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{member.full_name}</div>
                        <div className="text-xs text-muted-foreground">{member.employee_code} · {member.designation}</div>
                      </td>
                      <td className="px-4 py-3">{member.department}</td>
                      <td className="px-4 py-3"><StatusBadge value={row ? statusLabel(row.status) : "Not marked"} /></td>
                      <td className="px-4 py-3">{row?.shift ?? member.shift ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={selectedShift}
                          onChange={(event) => setSelectedShifts((current) => ({ ...current, [member.id]: event.target.value }))}
                          className="mb-2 h-9 min-w-[220px] rounded-md border border-input bg-background px-2 text-sm"
                          aria-label={`Shift for ${member.full_name}`}
                        >
                          {SHIFT_OPTIONS.map((shift) => <option key={shift} value={shift}>{shift}</option>)}
                        </select>
                        <select
                          value={row?.status ?? ""}
                          onChange={(event) => {
                            if (!event.target.value) return;
                            saveAttendance.mutate({ staffId: member.id, date: selectedDate, status: event.target.value, shift: selectedShift });
                          }}
                          className="h-9 min-w-[180px] rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="" disabled>Select status</option>
                          {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard className="mt-6" title="Department-wise attendance" description={`Summary for ${selectedDate}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3">Department</th><th className="px-4 py-3 text-right">Present</th><th className="px-4 py-3 text-right">1/2 AM</th><th className="px-4 py-3 text-right">1/2 PM</th><th className="px-4 py-3 text-right">Absent</th><th className="px-4 py-3 text-right">Leave</th><th className="px-4 py-3 text-right">Week Off</th><th className="px-4 py-3 text-right">Festival</th><th className="px-4 py-3 text-right">Overtime</th><th className="px-4 py-3 text-right">Comp-Off</th><th className="px-4 py-3 text-right">Not marked</th><th className="px-4 py-3 text-right">Staff</th>
            </tr></thead>
            <tbody>
              {departmentSummary.map((row) => (
                <tr key={row.department} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{row.department}</td><td className="px-4 py-3 text-right">{row.present}</td><td className="px-4 py-3 text-right">{row.halfAM}</td><td className="px-4 py-3 text-right">{row.halfPM}</td><td className="px-4 py-3 text-right">{row.absent}</td><td className="px-4 py-3 text-right">{row.leave}</td><td className="px-4 py-3 text-right">{row.weekOff}</td><td className="px-4 py-3 text-right">{row.festivalHoliday}</td><td className="px-4 py-3 text-right">{row.overtime}</td><td className="px-4 py-3 text-right">{row.compOff}</td><td className="px-4 py-3 text-right">{row.notMarked}</td><td className="px-4 py-3 text-right">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard className="mt-6" title="Monthly attendance summary" description={`${selectedMonth} · Present equivalent = Present + 0.5 for each half day`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3">Staff</th><th className="px-4 py-3">Department</th><th className="px-4 py-3 text-right">Present</th><th className="px-4 py-3 text-right">1/2 AM</th><th className="px-4 py-3 text-right">1/2 PM</th><th className="px-4 py-3 text-right">Absent</th><th className="px-4 py-3 text-right">Leave</th><th className="px-4 py-3 text-right">Week Off</th><th className="px-4 py-3 text-right">Festival</th><th className="px-4 py-3 text-right">Overtime</th><th className="px-4 py-3 text-right">Comp-Off</th><th className="px-4 py-3 text-right">Present equivalent</th>
            </tr></thead>
            <tbody>
              {monthlySummary.map((row) => (
                <tr key={row.staff.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{row.staff.full_name}<div className="text-xs text-muted-foreground">{row.staff.employee_code}</div></td>
                  <td className="px-4 py-3">{row.staff.department}</td><td className="px-4 py-3 text-right">{row.present}</td><td className="px-4 py-3 text-right">{row.halfAM}</td><td className="px-4 py-3 text-right">{row.halfPM}</td><td className="px-4 py-3 text-right">{row.absent}</td><td className="px-4 py-3 text-right">{row.leave}</td><td className="px-4 py-3 text-right">{row.weekOff}</td><td className="px-4 py-3 text-right">{row.festivalHoliday}</td><td className="px-4 py-3 text-right">{row.overtime}</td><td className="px-4 py-3 text-right">{row.compOff}</td><td className="px-4 py-3 text-right font-semibold">{row.presentEquivalent.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard className="mt-6" title="Attendance history" description={`Filtered records for ${selectedMonth}`}>
        {historyRows.length === 0 ? (
          <EmptyState message="No attendance records match the selected filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3">Date</th><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3 text-right">Action</th>
              </tr></thead>
              <tbody>
                {historyRows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap">{row.attendance_date}</td>
                    <td className="px-4 py-3 font-medium">{row.staff?.full_name ?? "—"}</td>
                    <td className="px-4 py-3">{row.staff?.department ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge value={statusLabel(row.status)} /></td>
                    <td className="px-4 py-3">{row.check_in ?? "—"}</td>
                    <td className="px-4 py-3">{row.check_out ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const next = window.prompt(
                            "Enter a new attendance status: present, absent, half_day_am_absent, half_day_pm_absent, leave, week_off, festival_holiday, overtime, comp_off",
                            row.status,
                          );
                          if (!next || !STATUS_OPTIONS.some((item) => item.value === next)) {
                            if (next) toast.error("Invalid attendance status");
                            return;
                          }
                          saveAttendance.mutate({ staffId: row.staff_id, date: row.attendance_date, status: next, shift: row.shift ?? SHIFT_OPTIONS[0] });
                        }}
                      >
                        Change status
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}
