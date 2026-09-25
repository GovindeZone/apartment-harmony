import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, KeyRound, Search, Users, Plus, Pencil } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionCard, StatCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { familyQuery, flatsQuery, residentsQuery, vehiclesQuery, type Resident, type Flat } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/residents")({
  head: () => ({ meta: [{ title: "Residents — Indus Anantya Apartment" }, { name: "description", content: "Resident and flat directory with apartment structure and period of stay." }] }),
  component: ResidentsPage,
});

function ResidentsPage() {
  const qc = useQueryClient();
  const residents = useQuery(residentsQuery);
  const flats = useQuery(flatsQuery);
  const vehicles = useQuery(vehiclesQuery);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [block, setBlock] = useState("all");
  const [zone, setZone] = useState("all");
  const [selected, setSelected] = useState<Resident | null>(null);
  const [editing, setEditing] = useState<Resident | null>(null);
  const [creating, setCreating] = useState(false);

  const blocks = useMemo(() => Array.from(new Set((flats.data ?? []).map(f => f.block))).sort(), [flats.data]);
  const zones = useMemo(() => Array.from(new Set((flats.data ?? []).map(f => f.zone))).sort(), [flats.data]);
  const needle = q.trim().toLowerCase();
  const vehicleByResident = new Map<string, string[]>();
  for (const v of vehicles.data ?? []) if (v.resident_id) vehicleByResident.set(v.resident_id, [...(vehicleByResident.get(v.resident_id) ?? []), v.vehicle_no]);

  const residentRows = (residents.data ?? []).filter(r => {
    const text = [r.full_name, r.phone ?? "", r.whatsapp ?? "", r.email ?? "", r.flats?.flat_no ?? "", r.flats?.block ?? "", r.flats?.zone ?? "", ...(vehicleByResident.get(r.id) ?? [])].join(" ").toLowerCase();
    return (!needle || text.includes(needle)) && (type === "all" || r.resident_type === type) && (block === "all" || r.flats?.block === block) && (zone === "all" || r.flats?.zone === zone);
  });
  const flatRows = (flats.data ?? []).filter(f => (!needle || [f.flat_no, f.block, f.zone].join(" ").toLowerCase().includes(needle)) && (block === "all" || f.block === block) && (zone === "all" || f.zone === zone));
  const vehicleRows = (vehicles.data ?? []).filter(v => !needle || [v.vehicle_no, v.make_model ?? "", v.flats?.flat_no ?? "", v.residents?.full_name ?? ""].join(" ").toLowerCase().includes(needle));
  const owners = (residents.data ?? []).filter(r => r.resident_type === "owner").length;
  const tenants = (residents.data ?? []).filter(r => r.resident_type === "tenant").length;
  const occupied = (flats.data ?? []).filter(f => f.status === "occupied").length;

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["residents"] });
    void qc.invalidateQueries({ queryKey: ["flats"] });
  }

  return (
    <AppShell title="Residents" description="Create, edit and maintain resident, flat and period-of-stay details">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Residents" value={residents.data?.length ?? 0} icon={Users} />
        <StatCard label="Owners" value={owners} icon={KeyRound} tone="success" />
        <StatCard label="Tenants" value={tenants} icon={Home} />
        <StatCard label="Occupied flats" value={`${occupied}/${flats.data?.length ?? 0}`} tone="warning" />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, flat, phone, WhatsApp or vehicle" className="h-11 pl-9" /></div>
        <Pick value={type} onChange={setType} options={["all", "owner", "tenant"]} />
        <Pick value={block} onChange={setBlock} options={["all", ...blocks]} />
        <Pick value={zone} onChange={setZone} options={["all", ...zones]} />
      </div>

      <div className="mt-5 flex justify-end"><Button onClick={() => setCreating(true)}><Plus className="mr-2 size-4" />Create Resident</Button></div>

      <Tabs defaultValue="residents" className="mt-4">
        <TabsList><TabsTrigger value="residents">Residents</TabsTrigger><TabsTrigger value="flats">Flat directory</TabsTrigger><TabsTrigger value="vehicles">Vehicles</TabsTrigger></TabsList>
        <TabsContent value="residents" className="mt-4">
          <SectionCard title={`${residentRows.length} residents`}>
            {residentRows.length === 0 ? <div className="p-5"><EmptyState message="No residents matched these filters." /></div> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b text-left"><th className="p-3">Name</th><th className="p-3">Flat</th><th className="p-3">Zone / Block / Floor</th><th className="p-3">Type</th><th className="p-3">Period of stay</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>
                {residentRows.map(r => <tr key={r.id} className="border-b last:border-0"><td className="p-3 font-medium">{r.full_name}</td><td className="p-3">{r.flats?.flat_no ?? "—"}</td><td className="p-3">{r.flats ? `${r.flats.zone} / ${r.flats.block} / Floor ${r.flats.floor}` : "—"}</td><td className="p-3 capitalize">{r.resident_type}</td><td className="p-3 whitespace-nowrap">{r.move_in_date ?? "—"} → {r.move_out_date ?? "Present"}</td><td className="p-3"><StatusBadge value={r.status} /></td><td className="p-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setSelected(r)}>View</Button><Button size="sm" variant="outline" onClick={() => setEditing(r)}><Pencil className="mr-1 size-4" />Edit</Button></div></td></tr>)}
              </tbody></table></div>
            )}
          </SectionCard>
        </TabsContent>
        <TabsContent value="flats" className="mt-4"><SectionCard title={`${flatRows.length} flats`}><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Flat</th><th className="p-3">Zone</th><th className="p-3">Block</th><th className="p-3">Floor</th><th className="p-3">Bedrooms</th><th className="p-3">Area</th><th className="p-3">Status</th></tr></thead><tbody>{flatRows.map(f => <tr key={f.id} className="border-b"><td className="p-3 font-medium">{f.flat_no}</td><td className="p-3">{f.zone}</td><td className="p-3">{f.block}</td><td className="p-3">{f.floor}</td><td className="p-3">{f.bedrooms} BHK</td><td className="p-3">{f.area_sqft ? `${f.area_sqft} sq ft` : "—"}</td><td className="p-3"><StatusBadge value={f.status} /></td></tr>)}</tbody></table></div></SectionCard></TabsContent>
        <TabsContent value="vehicles" className="mt-4"><SectionCard title={`${vehicleRows.length} vehicles`}><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Vehicle no</th><th className="p-3">Type</th><th className="p-3">Make / model</th><th className="p-3">Flat</th><th className="p-3">Resident</th><th className="p-3">Sticker</th></tr></thead><tbody>{vehicleRows.map(v => <tr key={v.id} className="border-b"><td className="p-3 font-medium">{v.vehicle_no}</td><td className="p-3 capitalize">{v.vehicle_type}</td><td className="p-3">{v.make_model ?? "—"}</td><td className="p-3">{v.flats?.flat_no ?? "—"}</td><td className="p-3">{v.residents?.full_name ?? "—"}</td><td className="p-3">{v.sticker_no ?? "—"}</td></tr>)}</tbody></table></div></SectionCard></TabsContent>
      </Tabs>

      <ResidentDialog resident={selected} onClose={() => setSelected(null)} />
      <ResidentFormDialog resident={editing} open={creating || !!editing} flats={flats.data ?? []} onClose={() => { setCreating(false); setEditing(null); }} onSaved={() => { setCreating(false); setEditing(null); refresh(); }} />
    </AppShell>
  );
}

function ResidentDialog({ resident, onClose }: { resident: Resident | null; onClose: () => void }) {
  const family = useQuery({ ...familyQuery(resident?.id ?? ""), enabled: !!resident });
  return <Dialog open={!!resident} onOpenChange={v => !v && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{resident?.full_name}</DialogTitle></DialogHeader>{resident ? <div className="space-y-5 text-sm">
    <div className="grid grid-cols-2 gap-4"><Info label="Flat" value={resident.flats?.flat_no ?? "—"} /><Info label="Zone" value={resident.flats?.zone ?? "—"} /><Info label="Block" value={resident.flats?.block ?? "—"} /><Info label="Floor" value={resident.flats ? String(resident.flats.floor) : "—"} /><Info label="Type" value={resident.resident_type} /><Info label="Period of stay" value={`${resident.move_in_date ?? "—"} to ${resident.move_out_date ?? "Present"}`} /><Info label="Phone" value={resident.phone ?? "—"} /><Info label="WhatsApp" value={resident.whatsapp ?? "—"} /><Info label="Email" value={resident.email ?? "—"} /><Info label="Status" value={resident.status} /></div>
    <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Family members</h3>{(family.data ?? []).length ? <ul className="space-y-1">{(family.data ?? []).map(m => <li key={m.id} className="flex justify-between"><span>{m.full_name}</span><span className="text-muted-foreground">{m.relation ?? "—"}</span></li>)}</ul> : <p className="text-muted-foreground">No family members on record.</p>}</div>
  </div> : null}</DialogContent></Dialog>;
}

function ResidentFormDialog({ resident, open, flats, onClose, onSaved }: { resident: Resident | null; open: boolean; flats: Flat[]; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const selectedFlat = flats.find(f => f.id === resident?.flat_id);
  const [flatId, setFlatId] = useState(resident?.flat_id ?? "");
  const [residentType, setResidentType] = useState(resident?.resident_type ?? "owner");
  const [occupantType, setOccupantType] = useState(resident?.occupant_type ?? "family");

  useMemo(() => {
    setFlatId(resident?.flat_id ?? "");
    setResidentType(resident?.resident_type ?? "owner");
    setOccupantType(resident?.occupant_type ?? "family");
  }, [resident]);

  const currentFlat = flats.find(f => f.id === flatId) ?? selectedFlat;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!flatId) { toast.error("Select a flat."); return; }
    const f = new FormData(e.currentTarget);
    const from = String(f.get("stay_from") ?? "");
    const to = String(f.get("stay_to") ?? "");
    if (from && to && to < from) { toast.error("Period of stay 'To' date cannot be before 'From' date."); return; }
    const phone = String(f.get("phone") ?? "").replace(/\D/g, "");
    const whatsapp = String(f.get("whatsapp") ?? "").replace(/\D/g, "");
    if (phone && !/^\d{10}$/.test(phone)) { toast.error("Phone number must be exactly 10 digits."); return; }
    if (whatsapp && !/^\d{10}$/.test(whatsapp)) { toast.error("WhatsApp number must be exactly 10 digits."); return; }
    setSaving(true);
    const payload = { full_name: String(f.get("full_name") ?? "").trim(), flat_id: flatId, resident_type: residentType, occupant_type: occupantType, phone, whatsapp, email: String(f.get("email") ?? "").trim(), move_in_date: from || null, move_out_date: to || null, status: String(f.get("status") ?? "active") };
    const query = resident ? supabase.from("residents").update(payload as never).eq("id", resident.id) : supabase.from("residents").insert(payload as never);
    const { error } = await query;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(resident ? "Resident details updated." : "Resident created.");
    onSaved();
  }

  return <Dialog open={open} onOpenChange={v => !v && onClose()}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{resident ? "Edit Resident" : "Create Resident"}</DialogTitle></DialogHeader>
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2"><Label>Full name</Label><Input name="full_name" required defaultValue={resident?.full_name ?? ""} /></div>
      <div className="space-y-2 sm:col-span-2"><Label>Flat</Label><select value={flatId} onChange={e => setFlatId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select flat</option>{flats.map(f => <option key={f.id} value={f.id}>{f.flat_no} — {f.zone} / {f.block} / Floor {f.floor}</option>)}</select></div>
      <div className="grid grid-cols-3 gap-2 sm:col-span-2 rounded-lg border bg-muted/30 p-3"><Info label="Zone" value={currentFlat?.zone ?? "—"} /><Info label="Block" value={currentFlat?.block ?? "—"} /><Info label="Floor" value={currentFlat ? String(currentFlat.floor) : "—"} /></div>
      <div className="space-y-2"><Label>Resident type</Label><select value={residentType} onChange={e => setResidentType(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="owner">Owner</option><option value="tenant">Tenant</option></select></div>
      <div className="space-y-2"><Label>Occupant type</Label><select value={occupantType} onChange={e => setOccupantType(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="family">Family</option><option value="bachelors">Bachelors</option></select></div>
      <div className="space-y-2"><Label>Phone</Label><Input name="phone" maxLength={10} inputMode="numeric" defaultValue={resident?.phone ?? ""} /></div>
      <div className="space-y-2"><Label>WhatsApp</Label><Input name="whatsapp" maxLength={10} inputMode="numeric" defaultValue={resident?.whatsapp ?? ""} /></div>
      <div className="space-y-2 sm:col-span-2"><Label>Email</Label><Input name="email" type="email" defaultValue={resident?.email ?? ""} /></div>
      <div className="space-y-2"><Label>Period of stay — From</Label><Input name="stay_from" type="date" defaultValue={resident?.move_in_date ?? ""} /></div>
      <div className="space-y-2"><Label>Period of stay — To</Label><Input name="stay_to" type="date" defaultValue={resident?.move_out_date ?? ""} /></div>
      <p className="text-xs text-muted-foreground sm:col-span-2">Both dates use the calendar picker. Leave “To” blank when the resident is currently staying in the apartment.</p>
      <div className="space-y-2"><Label>Status</Label><select name="status" defaultValue={resident?.status ?? "active"} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : resident ? "Save Changes" : "Create Resident"}</Button></div>
    </form>
  </DialogContent></Dialog>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-0.5 font-medium capitalize">{value}</dd></div>; }
function Pick({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) { return <select value={value} onChange={e => onChange(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm capitalize">{options.map(o => <option key={o} value={o}>{o}</option>)}</select>; }
