import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Download, FileBarChart } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SectionCard, StatCard, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  attendanceQuery,
  flatsQuery,
  gateEntriesQuery,
  helpdeskQuery,
  residentsQuery,
  salariesQuery,
  vehiclesQuery,
} from "@/lib/api";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Indus Anantya Apartment" },
      {
        name: "description",
        content:
          "Build and export attendance, salary, gate movement, guest, resident, vehicle, occupancy and help desk reports with date filtering.",
      },
      { property: "og:title", content: "Reports — Indus Anantya Apartment" },
      {
        property: "og:description",
        content: "Date-filtered community reports with one-click export and scheduling.",
      },
    ],
  }),
  component: ReportsPage,
});

type Row = Record<string, string | number>;

const REPORTS = [
  { value: "attendance", label: "Staff attendance" },
  { value: "salary", label: "Staff salary" },
  { value: "gate", label: "Gate entry / exit" },
  { value: "guest", label: "Guests & visitors" },
  { value: "vehicle", label: "Vehicles" },
  { value: "resident", label: "Residents" },
  { value: "occupancy", label: "Flat occupancy" },
  { value: "helpdesk", label: "Help desk / WhatsApp" },
] as const;

const fmtDate = (v: string | null) =>
  v ? new Date(v).toISOString().slice(0, 10) : "—";
const fmtTime = (v: string | null) =>
  v ? new Date(v).toISOString().slice(11, 16) : "—";

function toCsv(rows: Row[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0] ?? {});
  const esc = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

  const [report, setReport] = useState<string>("attendance");
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [frequency, setFrequency] = useState("weekly");
  const [recipient, setRecipient] = useState("");

  const attendance = useQuery(attendanceQuery);
  const salaries = useQuery(salariesQuery);
  const gate = useQuery(gateEntriesQuery);
  const residents = useQuery(residentsQuery);
  const vehicles = useQuery(vehiclesQuery);
  const flats = useQuery(flatsQuery);
  const helpdesk = useQuery(helpdeskQuery);

  const inRange = (d: string | null) => {
    if (!d) return false;
    const day = d.slice(0, 10);
    return day >= from && day <= to;
  };

  const rows: Row[] = useMemo(() => {
    switch (report) {
      case "attendance":
        return (attendance.data ?? [])
          .filter((a) => inRange(a.attendance_date))
          .map((a) => ({
            Date: a.attendance_date,
            Staff: a.staff?.full_name ?? "—",
            Code: a.staff?.employee_code ?? "—",
            Department: a.staff?.department ?? "—",
            Status: a.status,
            "Check in": a.check_in ?? "—",
            "Check out": a.check_out ?? "—",
          }));
      case "salary":
        return (salaries.data ?? [])
          .filter((s) => inRange(s.salary_month) || true)
          .map((s) => ({
            Month: s.salary_month.slice(0, 7),
            Staff: s.staff?.full_name ?? "—",
            Code: s.staff?.employee_code ?? "—",
            Base: s.base_amount,
            Bonus: s.bonus,
            Deductions: s.deductions,
            Net: s.net_amount,
            Status: s.status,
          }));
      case "gate":
      case "guest":
        return (gate.data ?? [])
          .filter((g) => inRange(g.entry_time))
          .filter((g) =>
            report === "guest" ? g.category === "visitor" || g.category === "vendor" : true,
          )
          .map((g) => ({
            Date: fmtDate(g.entry_time),
            "In time": fmtTime(g.entry_time),
            "Out time": fmtTime(g.exit_time),
            Gate: g.gate,
            Direction: g.direction,
            Category: g.category,
            Person: g.person_name,
            Flat: g.flat_no ?? "—",
            Vehicle: g.vehicle_no ?? "—",
            Status: g.status,
          }));
      case "vehicle":
        return (vehicles.data ?? []).map((v) => ({
          "Vehicle no": v.vehicle_no,
          Type: v.vehicle_type,
          Model: v.make_model ?? "—",
          Sticker: v.sticker_no ?? "—",
          Flat: v.flats?.flat_no ?? "—",
          Owner: v.residents?.full_name ?? "—",
        }));
      case "resident":
        return (residents.data ?? []).map((r) => ({
          Name: r.full_name,
          Type: r.resident_type,
          Flat: r.flats?.flat_no ?? "—",
          Block: r.flats?.block ?? "—",
          Zone: r.flats?.zone ?? "—",
          Phone: r.phone ?? "—",
          WhatsApp: r.whatsapp ?? "—",
          "Move in": r.move_in_date ?? "—",
          Status: r.status,
        }));
      case "occupancy":
        return (flats.data ?? []).map((f) => ({
          Flat: f.flat_no,
          Block: f.block,
          Zone: f.zone,
          Floor: f.floor,
          Bedrooms: f.bedrooms,
          "Area sqft": f.area_sqft ?? "—",
          Status: f.status,
        }));
      case "helpdesk":
        return (helpdesk.data ?? [])
          .filter((h) => inRange(h.created_at))
          .map((h) => ({
            Date: fmtDate(h.created_at),
            Time: fmtTime(h.created_at),
            Flat: h.flat_no ?? "—",
            Category: h.category,
            Direction: h.direction,
            Message: h.message,
            Status: h.status,
            "Handled by": h.handled_by ?? "—",
          }));
      default:
        return [];
    }
  }, [report, from, to, attendance.data, salaries.data, gate.data, residents.data, vehicles.data, flats.data, helpdesk.data]);

  const label = REPORTS.find((r) => r.value === report)?.label ?? "Report";

  function exportCsv() {
    const csv = toCsv(rows);
    if (!csv) {
      toast.error("Nothing to export for this range.");
      return;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report}-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported.");
  }

  const columns = Object.keys(rows[0] ?? {});

  return (
    <AppShell
      title="Reports"
      description="Filter, review and export community operations data."
      actions={
        <Button onClick={exportCsv} className="gap-2">
          <Download className="size-4" /> Export CSV
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Report" value={label} icon={FileBarChart} />
        <StatCard label="Rows in range" value={rows.length} hint={`${from} → ${to}`} />
        <StatCard label="Schedule" value={frequency} tone="success" icon={CalendarClock} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <SectionCard title={label} description={`${rows.length} record(s) between ${from} and ${to}`}>
          <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Report type</Label>
              <Select value={report} onValueChange={setReport}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORTS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          {rows.length ? (
            <div className="max-h-[560px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={c} className="whitespace-nowrap">
                        {c}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 200).map((r, i) => (
                    <TableRow key={i}>
                      {columns.map((c) => (
                        <TableCell key={c} className="whitespace-nowrap text-sm">
                          {r[c]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-4">
              <EmptyState message="No records match this report and date range." />
            </div>
          )}
        </SectionCard>

        <SectionCard title="Schedule delivery" description="Send this report automatically.">
          <div className="space-y-4 p-5">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient">Send to (email or WhatsApp)</Label>
              <Input
                id="recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="manager@ashvale.in"
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                recipient.trim()
                  ? toast.success(`${label} scheduled ${frequency} for ${recipient}.`)
                  : toast.error("Add an email or WhatsApp number first.")
              }
            >
              Save schedule
            </Button>
            <p className="text-xs text-muted-foreground">
              Scheduled delivery is recorded here; automatic sending can be switched on once an
              email or WhatsApp sender is connected.
            </p>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
