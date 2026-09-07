import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SectionCard, StatCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { gateEntriesQuery } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({
    meta: [
      { title: "Security Gates — Ashvale Residency Ops" },
      {
        name: "description",
        content:
          "Record and track resident, vendor, visitor and vehicle movement across the IN, Side and OUT gates.",
      },
      { property: "og:title", content: "Security Gates — Ashvale Residency Ops" },
      {
        property: "og:description",
        content: "Fast gate entry and exit logging for the community security team.",
      },
    ],
  }),
  component: SecurityPage,
});

const GATES = ["IN Gate", "Side Gate", "OUT Gate"] as const;
const CATEGORIES = ["resident", "vendor", "visitor", "staff", "person"] as const;

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const dateOf = (iso: string) => new Date(iso).toLocaleDateString("en-IN");

function SecurityPage() {
  const qc = useQueryClient();
  const entries = useQuery(gateEntriesQuery);
  const [gate, setGate] = useState<string>(GATES[0]);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (entries.data ?? [])
      .filter((e) => e.gate === gate)
      .filter(
        (e) =>
          !needle ||
          [e.person_name, e.flat_no ?? "", e.vehicle_no ?? "", e.category].some((v) =>
            v.toLowerCase().includes(needle),
          ),
      );
  }, [entries.data, gate, q]);

  const todayKey = new Date().toDateString();
  const all = entries.data ?? [];
  const todayEntries = all.filter((e) => new Date(e.entry_time).toDateString() === todayKey);
  const inside = all.filter((e) => e.status === "inside");

  const add = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase.from("gate_entries").insert(payload as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Entry recorded");
      qc.invalidateQueries({ queryKey: ["gate_entries"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markExit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gate_entries")
        .update({ exit_time: new Date().toISOString(), status: "exited" } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Exit recorded");
      qc.invalidateQueries({ queryKey: ["gate_entries"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const direction = String(f.get("direction") || "in");
    add.mutate({
      gate,
      direction,
      category: String(f.get("category")),
      person_name: String(f.get("person_name")),
      phone: String(f.get("phone") || "") || null,
      flat_no: String(f.get("flat_no") || "") || null,
      vehicle_no: String(f.get("vehicle_no") || "").toUpperCase() || null,
      vehicle_type: String(f.get("vehicle_type") || "") || null,
      purpose: String(f.get("purpose") || "") || null,
      entry_time: new Date().toISOString(),
      exit_time: direction === "out" ? new Date().toISOString() : null,
      status: direction === "out" ? "exited" : "inside",
    });
    form.reset();
  }

  return (
    <AppShell title="Security" description="Gate entry and exit activity">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Movements today" value={todayEntries.length} icon={LogIn} />
        <StatCard label="Currently inside" value={inside.length} icon={LogOut} tone="warning" />
        <StatCard
          label="Vehicles today"
          value={todayEntries.filter((e) => e.vehicle_no).length}
          tone="success"
        />
      </div>

      <Tabs value={gate} onValueChange={setGate} className="mt-6">
        <TabsList className="grid w-full grid-cols-3 sm:max-w-md">
          {GATES.map((g) => (
            <TabsTrigger key={g} value={g}>
              {g}
            </TabsTrigger>
          ))}
        </TabsList>

        {GATES.map((g) => (
          <TabsContent key={g} value={g} className="mt-4 space-y-4">
            <SectionCard title={`Quick entry — ${g}`} description="Record a movement in seconds">
              <form onSubmit={onSubmit} className="grid gap-4 p-5 md:grid-cols-3 xl:grid-cols-4">
                <Pick name="category" label="Category" options={[...CATEGORIES]} />
                <Pick name="direction" label="Direction" options={["in", "out"]} />
                <Field name="person_name" label="Person name" required />
                <Field name="flat_no" label="Flat no" />
                <Field name="phone" label="Phone" />
                <Field name="vehicle_no" label="Vehicle no" />
                <Pick
                  name="vehicle_type"
                  label="Vehicle type"
                  options={["", "car", "bike", "auto", "truck", "cycle"]}
                />
                <Field name="purpose" label="Purpose" />
                <div className="flex items-end md:col-span-3 xl:col-span-4">
                  <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={add.isPending}>
                    {add.isPending ? "Recording…" : "Record movement"}
                  </Button>
                </div>
              </form>
            </SectionCard>

            <SectionCard
              title={`${g} log`}
              actions={
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search name, flat, vehicle"
                    className="pl-9"
                  />
                </div>
              }
            >
              {rows.length === 0 ? (
                <div className="p-5">
                  <EmptyState message="No movements recorded at this gate yet." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>In</TableHead>
                        <TableHead>Out</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Person</TableHead>
                        <TableHead>Flat</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="whitespace-nowrap">{dateOf(e.entry_time)}</TableCell>
                          <TableCell>{timeOf(e.entry_time)}</TableCell>
                          <TableCell>{e.exit_time ? timeOf(e.exit_time) : "—"}</TableCell>
                          <TableCell className="capitalize">{e.category}</TableCell>
                          <TableCell className="font-medium">{e.person_name}</TableCell>
                          <TableCell>{e.flat_no ?? "—"}</TableCell>
                          <TableCell>
                            {e.vehicle_no ? (
                              <span className="whitespace-nowrap">
                                {e.vehicle_no}
                                <span className="text-muted-foreground"> · {e.vehicle_type ?? "—"}</span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge value={e.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            {e.status === "inside" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markExit.mutate(e.id)}
                              >
                                Mark exit
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Closed</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>
          </TabsContent>
        ))}
      </Tabs>
    </AppShell>
  );
}

function Field({ name, label, required }: { name: string; label: string; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required={required} className="h-11" />
    </div>
  );
}

function Pick({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "" ? "—" : o}
          </option>
        ))}
      </select>
    </div>
  );
}
