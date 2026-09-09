import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  UserX,
  Car,
  DoorOpen,
  Home,
  KeyRound,
  Building,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { StatCard, SectionCard, StatusBadge } from "@/components/ui-bits";
import {
  attendanceQuery,
  flatsQuery,
  gateEntriesQuery,
  residentsQuery,
  staffQuery,
} from "@/lib/api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Indus Anantya Apartment" },
      {
        name: "description",
        content: "Daily snapshot of staff attendance, gate activity, visitors and flat occupancy.",
      },
      { property: "og:title", content: "Dashboard — Indus Anantya Apartment" },
      {
        property: "og:description",
        content: "Daily snapshot of staff, gates, visitors and occupancy.",
      },
    ],
  }),
  component: Dashboard,
});

const today = () => new Date().toISOString().slice(0, 10);

function Dashboard() {
  const staff = useQuery(staffQuery);
  const attendance = useQuery(attendanceQuery);
  const gates = useQuery(gateEntriesQuery);
  const flats = useQuery(flatsQuery);
  const residents = useQuery(residentsQuery);

  const d = today();
  const todayAtt = (attendance.data ?? []).filter((a) => a.attendance_date === d);
  const todayGate = (gates.data ?? []).filter((g) => g.entry_time.slice(0, 10) === d);

  const totalStaff = (staff.data ?? []).filter((s) => s.status === "active").length;
  const present = todayAtt.filter((a) => a.status === "present").length;
  const absent = todayAtt.filter((a) => a.status !== "present").length;
  const guests = todayGate.filter((g) => g.category === "visitor").length;
  const vehiclesIn = todayGate.filter((g) => g.vehicle_no).length;
  const inside = (gates.data ?? []).filter(
    (g) => g.status === "inside" && g.category !== "resident",
  ).length;
  const occupied = (flats.data ?? []).filter((f) => f.status === "occupied").length;
  const vacant = (flats.data ?? []).filter((f) => f.status !== "occupied").length;
  const owners = (residents.data ?? []).filter((r) => r.resident_type === "owner").length;
  const tenants = (residents.data ?? []).filter((r) => r.resident_type === "tenant").length;

  const attTrend = Object.values(
    (attendance.data ?? []).reduce<Record<string, { date: string; present: number; absent: number }>>(
      (acc, a) => {
        const row = (acc[a.attendance_date] ??= {
          date: a.attendance_date.slice(5),
          present: 0,
          absent: 0,
        });
        if (a.status === "present") row.present += 1;
        else row.absent += 1;
        return acc;
      },
      {},
    ),
  )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  const gateActivity = ["IN Gate", "Side Gate", "OUT Gate"].map((gate) => {
    const rows = (gates.data ?? []).filter(
      (g) => g.gate.toLowerCase().replace(/[_\s]/g, "") === gate.toLowerCase().replace(/[_\s]/g, ""),
    );
    return {
      gate,
      entries: rows.filter((g) => g.direction === "in").length,
      exits: rows.filter((g) => g.direction === "out").length,
    };
  });

  const occupancy = [
    { name: "Occupied", value: occupied, fill: "var(--chart-1)" },
    { name: "Vacant", value: vacant, fill: "var(--chart-4)" },
  ];

  return (
    <AppShell
      title="Dashboard"
      description={new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total staff" value={totalStaff} icon={Users} />
        <StatCard label="Present today" value={present} icon={UserCheck} tone="success" />
        <StatCard label="Absent today" value={absent} icon={UserX} tone="danger" />
        <StatCard label="Guests today" value={guests} icon={DoorOpen} tone="warning" />
        <StatCard label="Vehicles entered today" value={vehiclesIn} icon={Car} />
        <StatCard label="Visitors inside" value={inside} icon={KeyRound} tone="warning" />
        <StatCard
          label="Flats occupied"
          value={`${occupied}/${(flats.data ?? []).length}`}
          hint={`${vacant} vacant`}
          icon={Building}
          tone="success"
        />
        <StatCard
          label="Owners / Tenants"
          value={`${owners} / ${tenants}`}
          hint={`${(residents.data ?? []).length} residents on record`}
          icon={Home}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <SectionCard title="Staff attendance" description="Last 7 recorded days" className="lg:col-span-2">
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="present" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="absent" stroke="var(--chart-4)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Occupancy" description="Flat status">
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={occupancy} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>
                  {occupancy.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Gate activity" description="Entries vs exits by gate">
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gateActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="gate" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="entries" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="exits" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Latest gate movements" description="Most recent 8 records">
          <ul className="divide-y divide-border">
            {(gates.data ?? []).slice(0, 8).map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{g.person_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {g.gate.replace(/_/g, " ")} · {g.category}
                    {g.flat_no ? ` · ${g.flat_no}` : ""}
                    {g.vehicle_no ? ` · ${g.vehicle_no}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(g.entry_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <StatusBadge value={g.status} />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}
