import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building, Bell } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/ui-bits";
import { attendanceQuery, facilityTasksQuery, flatsQuery, gateEntriesQuery, residentsQuery, staffQuery } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Indus Anantya Apartment" },
      { name: "description", content: "Apartment residents, staff, occupancy and visitor summary." },
    ],
  }),
  component: Dashboard,
});

const today = () => new Date().toISOString().slice(0, 10);

function Dashboard() {
  const staff = useQuery(staffQuery);
  const attendance = useQuery(attendanceQuery);
  const flats = useQuery(flatsQuery);
  const residents = useQuery(residentsQuery);
  const gates = useQuery(gateEntriesQuery);
  const facilityTasks = useQuery(facilityTasksQuery);

  const staffRows = staff.data ?? [];
  const attendanceRows = attendance.data ?? [];
  const flatRows = flats.data ?? [];
  const residentRows = residents.data ?? [];
  const gateRows = gates.data ?? [];
  const taskRows = facilityTasks.data ?? [];
  const date = today();
  const todayAttendance = attendanceRows.filter((row) => row.attendance_date === date);
  const communityStatusDate = new Date().toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const departments = Array.from(new Set(staffRows.map((row) => row.department).filter(Boolean))).sort();
  const departmentSummary = departments.map((department) => {
    const departmentStaff = staffRows.filter((row) => row.status === "active" && row.department === department);
    const departmentIds = new Set(departmentStaff.map((row) => row.id));
    const present = todayAttendance.filter((row) => departmentIds.has(row.staff_id) && row.status === "present").length;
    return { department, present, absent: Math.max(departmentStaff.length - present, 0), total: departmentStaff.length };
  });

  const occupied = flatRows.filter((flat) => flat.status === "occupied").length;
  const vacantFlats = flatRows.filter((flat) => flat.status !== "occupied");
  const owners = residentRows.filter((resident) => resident.status === "active" && resident.resident_type === "owner").length;
  const familyTenants = residentRows.filter((resident) => resident.status === "active" && resident.resident_type === "tenant" && resident.occupant_type === "family").length;
  const bachelorTenants = residentRows.filter((resident) => resident.status === "active" && resident.resident_type === "tenant" && resident.occupant_type === "bachelors").length;

  const residentChart = [
    { category: "Owners", count: owners },
    { category: "Tenants – Family", count: familyTenants },
    { category: "Tenants – Bachelors", count: bachelorTenants },
  ];

  const taskAge = (task: (typeof taskRows)[number]) => {
    const start = new Date(task.task_start_date);
    const end = new Date(date);
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
  };

  const taskRowsWithAge = taskRows.map((task) => ({ ...task, ageDays: taskAge(task) }));

  const visitorSummary: [{ label: string; owner: number; family: number; bachelor: number }] = [{ label: "Visitor", owner: 0, family: 0, bachelor: 0 }];
  gateRows.filter((entry) => entry.entry_time.slice(0, 10) === date && entry.category !== "resident").forEach((entry) => {
    const category = `${entry.category} ${entry.purpose ?? ""}`.toLowerCase();
    if (category.includes("bachelor")) visitorSummary[0].bachelor += 1;
    else if (category.includes("family") || category.includes("tenant")) visitorSummary[0].family += 1;
    else if (category.includes("owner")) visitorSummary[0].owner += 1;
    else visitorSummary[0].owner += 1;
  });

  return (
    <AppShell title="Dashboard" description={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>
      <div className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-primary">
          Community Status as of {communityStatusDate}
        </h2>
      </div>

      <div className="mb-5 flex justify-end">
        <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm lg:w-[520px]">
          <div className="flex items-center gap-3">
            <Bell className="size-5 shrink-0 text-amber-700" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-amber-900">Notifications</h2>
              <p className="text-xs text-amber-800">Holiday, MC tenure, license and association renewal reminders will appear here.</p>
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 shadow-sm">
          <h2 className="text-base font-semibold tracking-tight text-white">Facility Management</h2>
          <p className="mt-0.5 text-xs text-slate-200">Staff attendance and facility task monitoring</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard className="border-sky-200/80 bg-sky-50/40 dark:border-sky-900/70 dark:bg-sky-950/20" title="Staff attendance by department" description="Present, absent and total active staff today">
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-sky-100/70 dark:bg-sky-900/30"><tr className="border-b border-sky-200/70 text-left text-sky-900 dark:border-sky-800 dark:text-sky-100"><th className="px-4 py-3">Department</th><th className="px-4 py-3 text-right">Present</th><th className="px-4 py-3 text-right">Absent</th><th className="px-4 py-3 text-right">No. of staff</th></tr></thead><tbody>{departmentSummary.map((row) => <tr key={row.department} className="border-b border-border last:border-0"><td className="px-4 py-3 font-medium">{row.department}</td><td className="px-4 py-3 text-right">{row.present}</td><td className="px-4 py-3 text-right">{row.absent}</td><td className="px-4 py-3 text-right">{row.total}</td></tr>)}</tbody></table></div>
        </SectionCard>

        <SectionCard className="border-indigo-200/80 bg-indigo-50/40 dark:border-indigo-900/70 dark:bg-indigo-950/20" title="Task Management" description="Current facility tasks by type, status and ageing">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-indigo-200/70 bg-indigo-100/70 text-left text-indigo-900 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-100">
                  <th rowSpan={2} className="px-4 py-3">Task Name</th>
                  <th rowSpan={2} className="px-4 py-3">Task Type</th>
                  <th colSpan={3} className="px-4 py-2 text-center">Status</th>
                  <th colSpan={3} className="px-4 py-2 text-center">Task Ageing</th>
                </tr>
                <tr className="border-b border-indigo-200/70 bg-indigo-50/70 text-left text-xs text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200">
                  <th className="px-4 py-2 text-center">Not started</th>
                  <th className="px-4 py-2 text-center">In-Progress</th>
                  <th className="px-4 py-2 text-center">Completed</th>
                  <th className="px-4 py-2 text-center">&gt;7 days</th>
                  <th className="px-4 py-2 text-center">&gt;15 days</th>
                  <th className="px-4 py-2 text-center">&gt;1 month</th>
                </tr>
              </thead>
              <tbody>
                {taskRowsWithAge.length ? taskRowsWithAge.map((task) => {
                  const notStarted = false;
                  const inProgress = task.status === "In-Progress";
                  const completed = task.status === "Completed";
                  const ageing = task.status !== "Completed" && task.ageDays > 7;
                  return (
                    <tr key={task.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{task.task_name}</td>
                      <td className="px-4 py-3">{task.task_type}</td>
                      <td className="px-4 py-3 text-center">{notStarted ? "✓" : "—"}</td>
                      <td className="px-4 py-3 text-center">{inProgress ? "✓" : "—"}</td>
                      <td className="px-4 py-3 text-center">{completed ? "✓" : "—"}</td>
                      <td className="px-4 py-3 text-center">{ageing && task.ageDays > 7 ? "✓" : "—"}</td>
                      <td className="px-4 py-3 text-center">{ageing && task.ageDays > 15 ? "✓" : "—"}</td>
                      <td className="px-4 py-3 text-center">{ageing && task.ageDays > 30 ? "✓" : "—"}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No facility tasks found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 shadow-sm">
          <h2 className="text-base font-semibold tracking-tight text-white">Resident Management</h2>
          <p className="mt-0.5 text-xs text-slate-200">Resident, occupancy and visitor information</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">


        <SectionCard className="border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/70 dark:bg-emerald-950/20" title="Flat occupancy" description="Current flat status">
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-emerald-100/70 dark:bg-emerald-900/30"><tr className="border-b border-emerald-200/70 text-left text-emerald-900 dark:border-emerald-800 dark:text-emerald-100"><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Number of flats</th></tr></thead><tbody><tr className="border-b border-border"><td className="px-4 py-3 font-medium">Occupied Flats</td><td className="px-4 py-3 text-right">{occupied}</td></tr><tr><td className="px-4 py-3 font-medium">Vacant Flats</td><td className="px-4 py-3 text-right">{vacantFlats.length}</td></tr></tbody></table></div>
          <div className="mt-4 flex items-center gap-2 text-sm font-medium"><Building className="h-4 w-4" /> Vacant flat numbers</div>
          <div className="mt-2 flex flex-wrap gap-2">{vacantFlats.length ? vacantFlats.map((flat) => <span key={flat.id} className="rounded-md border border-border px-2 py-1 text-sm">{flat.flat_no}</span>) : <span className="text-sm text-muted-foreground">No vacant flats</span>}</div>
        </SectionCard>


          <SectionCard className="border-violet-200/80 bg-violet-50/40 dark:border-violet-900/70 dark:bg-violet-950/20" title="Resident detail by Category" description="Active residents by category">
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-violet-100/70 dark:bg-violet-900/30"><tr className="border-b border-violet-200/70 text-left text-violet-900 dark:border-violet-800 dark:text-violet-100"><th className="px-4 py-3">Resident</th><th className="px-4 py-3 text-right">No. of owner</th><th className="px-4 py-3 text-right">No. of tenant (family)</th><th className="px-4 py-3 text-right">No. of tenant (bachelors)</th></tr></thead><tbody><tr><td className="px-4 py-3 font-medium">Resident</td><td className="px-4 py-3 text-right">{owners}</td><td className="px-4 py-3 text-right">{familyTenants}</td><td className="px-4 py-3 text-right">{bachelorTenants}</td></tr></tbody></table></div>
        </SectionCard>


          <SectionCard className="border-amber-200/80 bg-amber-50/40 dark:border-amber-900/70 dark:bg-amber-950/20" title="Visitor details" description="Today's visitor entries by resident category">
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-amber-100/70 dark:bg-amber-900/30"><tr className="border-b border-amber-200/70 text-left text-amber-900 dark:border-amber-800 dark:text-amber-100"><th className="px-4 py-3">Visitor</th><th className="px-4 py-3 text-right">To owners</th><th className="px-4 py-3 text-right">To tenant (family)</th><th className="px-4 py-3 text-right">To tenant (bachelor)</th></tr></thead><tbody>{visitorSummary.map((row) => <tr key={row.label}><td className="px-4 py-3 font-medium">{row.label}</td><td className="px-4 py-3 text-right">{row.owner}</td><td className="px-4 py-3 text-right">{row.family}</td><td className="px-4 py-3 text-right">{row.bachelor}</td></tr>)}</tbody></table></div>
        </SectionCard>
          <SectionCard
            className="border-violet-200/80 bg-violet-50/40 dark:border-violet-900/70 dark:bg-violet-950/20"
            title="Resident mix"
            description="Owners and tenant categories"
          >
            <div className="h-80 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={residentChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="category" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" name="Residents" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      </section>
    </AppShell>
  );
}
