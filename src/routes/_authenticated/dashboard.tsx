import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Building, Bell } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui-bits";
import { attendanceQuery, facilityTasksQuery, flatsQuery, gateEntriesQuery, residentsQuery, staffQuery } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Indus Anantya Apartment" },
      { name: "description", content: "Apartment residents, staff, occupancy and visitor summary." },
      { property: "og:title", content: "Dashboard — Indus Anantya Apartment" },
      { property: "og:description", content: "Apartment residents, staff, occupancy and visitor summary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const today = () => new Date().toISOString().slice(0, 10);

function Dashboard() {
  const [activeTab, setActiveTab] = useState<"facility" | "mc">("facility");
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
  const departments = Array.from(new Set(staffRows.map((row) => row.department).filter(Boolean))).sort();
  const departmentSummary = departments.map((department) => {
    const departmentStaff = staffRows.filter((row) => row.status === "active" && row.department === department);
    const departmentIds = new Set(departmentStaff.map((row) => row.id));
    const present = todayAttendance.filter((row) => departmentIds.has(row.staff_id) && row.status === "present").length;
    return { department, present, absent: Math.max(departmentStaff.length - present, 0), total: departmentStaff.length };
  });
  const departmentTotals = departmentSummary.reduce(
    (totals, row) => ({
      present: totals.present + row.present,
      absent: totals.absent + row.absent,
      total: totals.total + row.total,
    }),
    { present: 0, absent: 0, total: 0 },
  );

  const occupied = flatRows.filter((flat) => flat.status === "occupied").length;
  const vacantFlats = flatRows.filter((flat) => flat.status !== "occupied");
  const owners = residentRows.filter((resident) => resident.status === "active" && resident.resident_type === "owner").length;
  const familyTenants = residentRows.filter((resident) => resident.status === "active" && resident.resident_type === "tenant" && resident.occupant_type === "family").length;
  const bachelorTenants = residentRows.filter((resident) => resident.status === "active" && resident.resident_type === "tenant" && resident.occupant_type === "bachelors").length;

  const residentMix = [
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

  const visitorSummary: [{ label: string; owner: number; family: number; bachelor: number }] = [
    { label: "Visitor", owner: 0, family: 0, bachelor: 0 },
  ];
  gateRows
    .filter((entry) => entry.entry_time.slice(0, 10) === date && entry.category !== "resident")
    .forEach((entry) => {
      const category = `${entry.category} ${entry.purpose ?? ""}`.toLowerCase();
      if (category.includes("bachelor")) visitorSummary[0].bachelor += 1;
      else if (category.includes("family") || category.includes("tenant")) visitorSummary[0].family += 1;
      else visitorSummary[0].owner += 1;
    });

  return (
    <AppShell
      title="Community Status | Dashboard"
      description={"As of " + new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })}
    >

      <div className="dashboard-content grid min-w-0 grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_240px] xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
      <div className="mb-5 flex w-full max-w-xl rounded-xl bg-muted/70 p-1">
        <Button
          type="button"
          onClick={() => setActiveTab("facility")}
          variant="ghost"
          aria-pressed={activeTab === "facility"}
          className={`h-auto min-h-11 min-w-0 flex-1 whitespace-normal rounded-lg px-2 py-2 text-sm font-semibold transition-colors ${
            activeTab === "facility"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background hover:text-foreground"
          }`}
        >
          Facility Dashboard
        </Button>
        <Button
          type="button"
          onClick={() => setActiveTab("mc")}
          variant="ghost"
          aria-pressed={activeTab === "mc"}
          className={`h-auto min-h-11 min-w-0 flex-1 whitespace-normal rounded-lg px-2 py-2 text-sm font-semibold transition-colors ${
            activeTab === "mc"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background hover:text-foreground"
          }`}
        >
          MC Dashboard
        </Button>
      </div>

      {activeTab === "facility" ? (
        <section>
          <div className="grid min-w-0 grid-cols-1 items-start gap-3 min-[1100px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] [&>*]:min-w-0 [&_table]:table-auto [&_th]:align-middle [&_td]:align-middle [&_th]:py-2 [&_td]:py-2 [&_h2]:text-sm [&_[data-slot=card]]:gap-0 [&_[data-slot=card]>div:first-child]:px-3 [&_[data-slot=card]>div:first-child]:py-3">
            <div className="grid min-w-0 gap-3 [&>*]:min-w-0">
            <SectionCard
              className="border-sky-200/80 bg-sky-50/40 dark:border-sky-900/70 dark:bg-sky-950/20"
              title="Staff attendance by department"
              description="Present, absent and total active staff today"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] table-fixed text-xs [&_th]:px-2 [&_td]:px-2">
                  <colgroup><col className="w-[40%]" /><col className="w-[20%]" /><col className="w-[20%]" /><col className="w-[20%]" /></colgroup>
                  <thead className="bg-sky-100/70 dark:bg-sky-900/30">
                    <tr className="border-b border-sky-200/70 text-left text-sky-900 dark:border-sky-800 dark:text-sky-100">
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3 text-right">Present</th>
                      <th className="px-4 py-3 text-right">Absent</th>
                      <th className="px-4 py-3 text-right">No. of staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentSummary.map((row) => (
                      <tr key={row.department} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium">{row.department}</td>
                        <td className="px-4 py-3 text-right">{row.present}</td>
                        <td className="px-4 py-3 text-right">{row.absent}</td>
                        <td className="px-4 py-3 text-right">{row.total}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-sky-300 bg-sky-100 font-bold text-sky-950 dark:border-sky-700 dark:bg-sky-900/60 dark:text-sky-50">
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right">{departmentTotals.present}</td>
                      <td className="px-4 py-3 text-right">{departmentTotals.absent}</td>
                      <td className="px-4 py-3 text-right">{departmentTotals.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </SectionCard>
            <SectionCard
              className="border-border bg-card"
              title="Resident mix"
              description="Owners and tenant categories"
            >
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground">
                  <tr className="border-b border-border">
                    {residentMix.map((row) => (
                      <th key={row.category} scope="col" className="px-2 py-2 text-center font-medium">{row.category}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {residentMix.map((row) => (
                      <td key={row.category} className="px-2 py-2 text-center font-semibold tabular-nums">{row.count}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </SectionCard>
            </div>
            <div className="grid min-w-0 gap-3 [&>*]:min-w-0">
            <SectionCard
              className="border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/70 dark:bg-emerald-950/20"
              title="Flat occupancy"
              description="Current flat status"
            >
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-xs [&_th]:px-2 [&_td]:px-2">
                  <thead className="bg-emerald-100/70 dark:bg-emerald-900/30">
                    <tr className="border-b border-emerald-200/70 text-left text-emerald-900 dark:border-emerald-800 dark:text-emerald-100">
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Number of flats</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="px-4 py-3 font-medium">Occupied Flats</td>
                      <td className="px-4 py-3 text-right">{occupied}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">Vacant Flats</td>
                      <td className="px-4 py-3 text-right">{vacantFlats.length}</td>
                    </tr>
                    <tr className="border-t-2 border-emerald-200 font-semibold dark:border-emerald-800">
                      <td className="px-4 py-3">Total Flats</td>
                      <td className="px-4 py-3 text-right">{flatRows.length}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mx-2 mt-3 flex items-center gap-2 text-xs font-medium">
                <Building className="h-4 w-4" /> Vacant flat numbers
              </div>
              <div className="mx-2 mb-3 mt-2 flex flex-wrap gap-2">
                {vacantFlats.length ? vacantFlats.map((flat) => (
                  <span key={flat.id} className="rounded-md border border-border px-2 py-1 text-xs">{flat.flat_no}</span>
                )) : <span className="text-xs text-muted-foreground">No vacant flats</span>}
              </div>
            </SectionCard>

            <SectionCard
              className="border-violet-200/80 bg-violet-50/40 dark:border-violet-900/70 dark:bg-violet-950/20"
              title="Resident detail by Category"
              description="Active residents by category"
            >
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-xs [&_th]:px-2 [&_td]:px-2">
                  <thead className="bg-violet-100/70 dark:bg-violet-900/30">
                    <tr className="border-b border-violet-200/70 text-left text-violet-900 dark:border-violet-800 dark:text-violet-100">
                      <th className="px-4 py-3">Resident category</th>
                      <th className="px-4 py-3 text-right">Residents</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="px-4 py-3 font-medium">Owners</td>
                      <td className="px-4 py-3 text-right">{owners}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-4 py-3 font-medium">Tenants (family)</td>
                      <td className="px-4 py-3 text-right">{familyTenants}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">Tenants (bachelors)</td>
                      <td className="px-4 py-3 text-right">{bachelorTenants}</td>
                    </tr>
                    <tr className="border-t-2 border-violet-200 font-semibold dark:border-violet-800">
                      <td className="px-4 py-3">Total Flats</td>
                      <td className="px-4 py-3 text-right">{flatRows.length}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </SectionCard>
            </div>

          </div>
        </section>
      ) : (
        <section>
          <div className="grid min-w-0 grid-cols-1 gap-4 [&>*]:min-w-0">
            <SectionCard
              className="border-indigo-200/80 bg-indigo-50/40 dark:border-indigo-900/70 dark:bg-indigo-950/20"
              title="Task Management"
              description="Current facility tasks by type, status and ageing"
            >
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
                    {taskRowsWithAge.length ? (
                      taskRowsWithAge.map((task) => {
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
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                          No facility tasks found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard
              className="border-amber-200/80 bg-amber-50/40 dark:border-amber-900/70 dark:bg-amber-950/20"
              title="Visitor details"
              description="Today's visitor entries by resident category"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] table-fixed text-xs [&_th]:px-2 [&_td]:px-2 sm:text-sm">
                  <thead className="bg-amber-100/70 dark:bg-amber-900/30">
                    <tr className="border-b border-amber-200/70 text-left text-amber-900 dark:border-amber-800 dark:text-amber-100">
                      <th className="px-4 py-3">Visitor</th>
                      <th className="px-4 py-3 text-right">To owners</th>
                      <th className="px-4 py-3 text-right">To tenant (family)</th>
                      <th className="px-4 py-3 text-right">To tenant (bachelor)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitorSummary.map((row) => (
                      <tr key={row.label}>
                        <td className="px-4 py-3 font-medium">{row.label}</td>
                        <td className="px-4 py-3 text-right">{row.owner}</td>
                        <td className="px-4 py-3 text-right">{row.family}</td>
                        <td className="px-4 py-3 text-right">{row.bachelor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </section>
      )}
        </div>
        <aside aria-label="Notifications" className="min-w-0 self-stretch border-l border-border md:pl-5">
          <div className="sticky top-5 min-h-48 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Bell className="size-5 shrink-0 text-primary" />
              <h2 className="text-sm font-semibold text-card-foreground">Notifications</h2>
            </div>
            <p className="py-6 text-center text-sm text-muted-foreground">No notifications at the moment.</p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
