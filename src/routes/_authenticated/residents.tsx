import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Home, KeyRound, Pencil, Plus, Search, Trash2, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, SectionCard, StatCard, StatusBadge } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv, IMPORT_TEMPLATES, parseCsv } from "@/lib/csv";
import { familyQuery, flatsQuery, residentsQuery, settingsQuery, vehiclesQuery, type Flat, type Resident, type Settings, type Vehicle } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/residents")({
  head: () => ({ meta: [
    { title: "Residents — Indus Anantya Apartment" },
    { name: "description", content: "Manage residents, flats, vehicles and apartment occupancy." },
    { property: "og:title", content: "Residents — Indus Anantya Apartment" },
    { property: "og:description", content: "Manage residents, flats, vehicles and apartment occupancy." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ResidentsPage,
});

type DialogMode<T> = T | "create" | null;

function ResidentsPage() {
  const qc = useQueryClient();
  const residents = useQuery(residentsQuery);
  const flats = useQuery(flatsQuery);
  const vehicles = useQuery(vehiclesQuery);
  const settings = useQuery(settingsQuery);
  const [query, setQuery] = useState("");
  const [residentType, setResidentType] = useState("all");
  const [block, setBlock] = useState("all");
  const [zone, setZone] = useState("all");
  const [selected, setSelected] = useState<Resident | null>(null);
  const [residentDialog, setResidentDialog] = useState<DialogMode<Resident>>(null);
  const [flatDialog, setFlatDialog] = useState<DialogMode<Flat>>(null);
  const [vehicleDialog, setVehicleDialog] = useState<DialogMode<Vehicle>>(null);
  const residentUploadRef = useRef<HTMLInputElement>(null);
  const flatUploadRef = useRef<HTMLInputElement>(null);
  const vehicleUploadRef = useRef<HTMLInputElement>(null);

  const flatData = flats.data ?? [];
  const residentData = residents.data ?? [];
  const vehicleData = vehicles.data ?? [];
  const blocks = useMemo(() => Array.from(new Set([...(settings.data?.blocks ?? []), ...flatData.map((flat) => flat.block)])).sort(), [flatData, settings.data?.blocks]);
  const zones = useMemo(() => Array.from(new Set([...(settings.data?.zones ?? []), ...flatData.map((flat) => flat.zone)])).sort(), [flatData, settings.data?.zones]);
  const needle = query.trim().toLowerCase();
  const vehicleByResident = new Map<string, string[]>();
  vehicleData.forEach((vehicle) => {
    if (vehicle.resident_id) vehicleByResident.set(vehicle.resident_id, [...(vehicleByResident.get(vehicle.resident_id) ?? []), vehicle.vehicle_no]);
  });
  const residentRows = residentData.filter((resident) => {
    const text = [resident.full_name, resident.phone ?? "", resident.whatsapp ?? "", resident.email ?? "", resident.flats?.flat_no ?? "", resident.flats?.block ?? "", resident.flats?.zone ?? "", ...(vehicleByResident.get(resident.id) ?? [])].join(" ").toLowerCase();
    return (!needle || text.includes(needle)) && (residentType === "all" || resident.resident_type === residentType) && (block === "all" || resident.flats?.block === block) && (zone === "all" || resident.flats?.zone === zone);
  });
  const flatRows = flatData.filter((flat) => (!needle || [flat.flat_no, flat.block, flat.zone].join(" ").toLowerCase().includes(needle)) && (block === "all" || flat.block === block) && (zone === "all" || flat.zone === zone));
  const vehicleRows = vehicleData.filter((vehicle) => !needle || [vehicle.vehicle_no, vehicle.make_model ?? "", vehicle.flats?.flat_no ?? "", vehicle.residents?.full_name ?? ""].join(" ").toLowerCase().includes(needle));

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["residents"] });
    void qc.invalidateQueries({ queryKey: ["flats"] });
    void qc.invalidateQueries({ queryKey: ["vehicles"] });
  }

  async function remove(table: "residents" | "flats" | "vehicles", id: string, label: string) {
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${label} deleted.`);
    refresh();
  }

  async function importResidents(file: File) {
    const rows = parseCsv(await file.text());
    const flatByNumber = new Map(flatData.map((flat) => [flat.flat_no.toLowerCase(), flat]));
    const payloads = rows.flatMap((row) => {
      const flat = flatByNumber.get((row["flat_no"] ?? "").toLowerCase());
      if (!flat || !row["full_name"]) return [];
      return [{ full_name: row["full_name"], flat_id: flat.id, resident_type: row["resident_type"] || "owner", occupant_type: row["occupant_type"] || "family", phone: (row["phone"] || "").replace(/\D/g, ""), whatsapp: (row["whatsapp"] || "").replace(/\D/g, ""), email: row["email"] || "", move_in_date: row["move_in_date"] || null, move_out_date: row["move_out_date"] || null, status: row["status"] || "active" }];
    });
    if (!payloads.length) { toast.error("No valid rows matched an existing flat."); return; }
    const { error } = await supabase.from("residents").insert(payloads as never);
    if (error) { toast.error(error.message); return; }
    toast.success(`${payloads.length} resident record(s) imported.`);
    refresh();
  }

  async function importFlats(file: File) {
    const rows = parseCsv(await file.text());
    const payloads = rows.flatMap((row) => row["flat_no"] ? [{ flat_no: row["flat_no"], block: row["block"], zone: row["zone"], floor: Number(row["floor"]), bedrooms: Number(row["bedrooms"]), area_sqft: row["area_sqft"] ? Number(row["area_sqft"]) : null, status: row["status"] || "vacant" }] : []);
    if (!payloads.length) { toast.error("CSV has no valid flat rows."); return; }
    const { error } = await supabase.from("flats").insert(payloads as never);
    if (error) { toast.error(error.message); return; }
    toast.success(`${payloads.length} flat record(s) imported.`);
    refresh();
  }

  async function importVehicles(file: File) {
    const rows = parseCsv(await file.text());
    const flatByNumber = new Map(flatData.map((flat) => [flat.flat_no.toLowerCase(), flat]));
    const residentByName = new Map(residentData.map((resident) => [resident.full_name.toLowerCase(), resident]));
    const payloads = rows.flatMap((row) => {
      const flat = flatByNumber.get((row["flat_no"] ?? "").toLowerCase());
      if (!flat || !row["vehicle_no"]) return [];
      const resident = residentByName.get((row["resident_name"] ?? "").toLowerCase());
      return [{ vehicle_no: row["vehicle_no"].toUpperCase(), vehicle_type: row["vehicle_type"] || "car", make_model: row["make_model"] || null, flat_id: flat.id, resident_id: resident?.id ?? null, sticker_no: row["sticker_no"] || null }];
    });
    if (!payloads.length) { toast.error("No valid rows matched an existing flat."); return; }
    const { error } = await supabase.from("vehicles").insert(payloads as never);
    if (error) { toast.error(error.message); return; }
    toast.success(`${payloads.length} vehicle record(s) imported.`);
    refresh();
  }

  const templateButton = (key: keyof typeof IMPORT_TEMPLATES) => {
    const template = IMPORT_TEMPLATES[key];
    return <Button variant="outline" onClick={() => downloadCsv(template.file, [...template.headers], template.sample.map((row) => [...row]))}><FileText className="mr-2 size-4" />Template</Button>;
  };

  return <AppShell title="Residents" description="Create, edit and maintain resident, flat and vehicle details">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Residents" value={residentData.length} icon={Users} />
      <StatCard label="Owners" value={residentData.filter((resident) => resident.resident_type === "owner").length} icon={KeyRound} tone="success" />
      <StatCard label="Tenants" value={residentData.filter((resident) => resident.resident_type === "tenant").length} icon={Home} />
      <StatCard label="Occupied flats" value={`${flatData.filter((flat) => flat.status === "occupied").length}/${flatData.length}`} tone="warning" />
    </div>
    <div className="mt-6 grid gap-3 md:grid-cols-4">
      <div className="relative md:col-span-2"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, flat, phone, WhatsApp or vehicle" className="h-11 pl-9" /></div>
      <Pick value={residentType} onChange={setResidentType} options={["all", "owner", "tenant"]} />
      <Pick value={block} onChange={setBlock} options={["all", ...blocks]} />
      <Pick value={zone} onChange={setZone} options={["all", ...zones]} />
    </div>
    <Tabs defaultValue="residents" className="mt-5">
      <TabsList><TabsTrigger value="residents">Residents</TabsTrigger><TabsTrigger value="flats">Flat directory</TabsTrigger><TabsTrigger value="vehicles">Vehicles</TabsTrigger></TabsList>
      <TabsContent value="residents" className="mt-4 space-y-3">
        <Toolbar>{templateButton("residents")}<UploadButton inputRef={residentUploadRef} onFile={importResidents} /><Button onClick={() => setResidentDialog("create")}><Plus className="mr-2 size-4" />Create Resident</Button></Toolbar>
        <SectionCard title={`${residentRows.length} residents`}>{residentRows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b text-left"><Th>Name</Th><Th>Flat</Th><Th>Zone / Block / Floor</Th><Th>Type</Th><Th>Occupant</Th><Th>Period of stay</Th><Th>Status</Th><Th right>Actions</Th></tr></thead><tbody>{residentRows.map((resident) => <tr key={resident.id} className="border-b last:border-0"><Td strong>{resident.full_name}</Td><Td>{resident.flats?.flat_no ?? "—"}</Td><Td>{resident.flats ? `${resident.flats.zone} / ${resident.flats.block} / ${resident.flats.floor}` : "—"}</Td><Td capitalize>{resident.resident_type}</Td><Td capitalize>{resident.occupant_type}</Td><Td>{resident.move_in_date ?? "—"} → {resident.move_out_date ?? "Present"}</Td><Td><StatusBadge value={resident.status} /></Td><ActionCell onView={() => setSelected(resident)} onEdit={() => setResidentDialog(resident)} onDelete={() => void remove("residents", resident.id, resident.full_name)} /></tr>)}</tbody></table></div> : <Empty />}</SectionCard>
      </TabsContent>
      <TabsContent value="flats" className="mt-4 space-y-3">
        <Toolbar>{templateButton("flats")}<UploadButton inputRef={flatUploadRef} onFile={importFlats} /><Button onClick={() => setFlatDialog("create")}><Plus className="mr-2 size-4" />Add Flat</Button></Toolbar>
        <SectionCard title={`${flatRows.length} flats`}><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr className="border-b text-left"><Th>Flat</Th><Th>Zone</Th><Th>Block</Th><Th>Floor</Th><Th>Bedrooms</Th><Th>Area</Th><Th>Status</Th><Th right>Actions</Th></tr></thead><tbody>{flatRows.map((flat) => <tr key={flat.id} className="border-b"><Td strong>{flat.flat_no}</Td><Td>{flat.zone}</Td><Td>{flat.block}</Td><Td>{flat.floor}</Td><Td>{flat.bedrooms} BHK</Td><Td>{flat.area_sqft ? `${flat.area_sqft} sq ft` : "—"}</Td><Td><StatusBadge value={flat.status} /></Td><ActionCell onEdit={() => setFlatDialog(flat)} onDelete={() => void remove("flats", flat.id, `flat ${flat.flat_no}`)} /></tr>)}</tbody></table></div></SectionCard>
      </TabsContent>
      <TabsContent value="vehicles" className="mt-4 space-y-3">
        <Toolbar>{templateButton("vehicles")}<UploadButton inputRef={vehicleUploadRef} onFile={importVehicles} /><Button onClick={() => setVehicleDialog("create")}><Plus className="mr-2 size-4" />Add Vehicle</Button></Toolbar>
        <SectionCard title={`${vehicleRows.length} vehicles`}><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead><tr className="border-b text-left"><Th>Vehicle no</Th><Th>Type</Th><Th>Make / model</Th><Th>Flat</Th><Th>Resident</Th><Th>Sticker</Th><Th right>Actions</Th></tr></thead><tbody>{vehicleRows.map((vehicle) => <tr key={vehicle.id} className="border-b"><Td strong>{vehicle.vehicle_no}</Td><Td capitalize>{vehicle.vehicle_type}</Td><Td>{vehicle.make_model ?? "—"}</Td><Td>{vehicle.flats?.flat_no ?? "—"}</Td><Td>{vehicle.residents?.full_name ?? "—"}</Td><Td>{vehicle.sticker_no ?? "—"}</Td><ActionCell onEdit={() => setVehicleDialog(vehicle)} onDelete={() => void remove("vehicles", vehicle.id, vehicle.vehicle_no)} /></tr>)}</tbody></table></div></SectionCard>
      </TabsContent>
    </Tabs>
    <ResidentDetails resident={selected} onClose={() => setSelected(null)} />
    <ResidentForm key={residentDialog === "create" ? "resident-new" : residentDialog?.id ?? "resident-closed"} resident={residentDialog === "create" ? null : residentDialog} open={residentDialog !== null} flats={flatData} settings={settings.data ?? null} onClose={() => setResidentDialog(null)} onSaved={() => { setResidentDialog(null); refresh(); }} />
    <FlatForm key={flatDialog === "create" ? "flat-new" : flatDialog?.id ?? "flat-closed"} flat={flatDialog === "create" ? null : flatDialog} open={flatDialog !== null} settings={settings.data ?? null} onClose={() => setFlatDialog(null)} onSaved={() => { setFlatDialog(null); refresh(); }} />
    <VehicleForm key={vehicleDialog === "create" ? "vehicle-new" : vehicleDialog?.id ?? "vehicle-closed"} vehicle={vehicleDialog === "create" ? null : vehicleDialog} open={vehicleDialog !== null} flats={flatData} residents={residentData} onClose={() => setVehicleDialog(null)} onSaved={() => { setVehicleDialog(null); refresh(); }} />
  </AppShell>;
}

function ResidentDetails({ resident, onClose }: { resident: Resident | null; onClose: () => void }) {
  const family = useQuery({ ...familyQuery(resident?.id ?? ""), enabled: Boolean(resident) });
  return <Dialog open={Boolean(resident)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{resident?.full_name}</DialogTitle></DialogHeader>{resident ? <div className="space-y-5 text-sm"><div className="grid grid-cols-2 gap-4"><Info label="Flat" value={resident.flats?.flat_no ?? "—"} /><Info label="Zone" value={resident.flats?.zone ?? "—"} /><Info label="Block" value={resident.flats?.block ?? "—"} /><Info label="Floor" value={resident.flats ? String(resident.flats.floor) : "—"} /><Info label="Type" value={resident.resident_type} /><Info label="Occupant" value={resident.occupant_type} /><Info label="Phone" value={resident.phone ?? "—"} /><Info label="WhatsApp" value={resident.whatsapp ?? "—"} /><Info label="Email" value={resident.email ?? "—"} /><Info label="Status" value={resident.status} /></div><div><h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Family members</h3>{family.data?.length ? <ul className="space-y-1">{family.data.map((member) => <li key={member.id} className="flex justify-between"><span>{member.full_name}</span><span className="text-muted-foreground">{member.relation ?? "—"}</span></li>)}</ul> : <p className="text-muted-foreground">No family members on record.</p>}</div></div> : null}</DialogContent></Dialog>;
}

function ResidentForm({ resident, open, flats, settings, onClose, onSaved }: { resident: Resident | null; open: boolean; flats: Flat[]; settings: Settings | null; onClose: () => void; onSaved: () => void }) {
  const selectedFlat = flats.find((flat) => flat.id === resident?.flat_id);
  const [saving, setSaving] = useState(false);
  const [flatId, setFlatId] = useState(resident?.flat_id ?? "");
  const [zone, setZone] = useState(selectedFlat?.zone ?? "");
  const [block, setBlock] = useState(selectedFlat?.block ?? "");
  const [floor, setFloor] = useState(selectedFlat ? String(selectedFlat.floor) : "");
  const [type, setType] = useState(resident?.resident_type ?? "owner");
  const [occupant, setOccupant] = useState(resident?.occupant_type ?? "family");
  const zones = Array.from(new Set([...(settings?.zones ?? []), ...flats.map((flat) => flat.zone)])).sort();
  const blocks = Array.from(new Set([...(settings?.blocks ?? []), ...flats.map((flat) => flat.block)])).sort();
  const floors = Array.from(new Set([...(settings?.floors ?? []), ...flats.map((flat) => String(flat.floor))])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const matching = flats.filter((flat) => (!zone || flat.zone === zone) && (!block || flat.block === block) && (!floor || String(flat.floor) === floor));
  function setStructure(kind: "zone" | "block" | "floor", value: string) {
    if (kind === "zone") setZone(value); else if (kind === "block") setBlock(value); else setFloor(value);
    const flat = flats.find((item) => item.id === flatId);
    if (!flat) return;
    const next = { zone: kind === "zone" ? value : zone, block: kind === "block" ? value : block, floor: kind === "floor" ? value : floor };
    if (flat.zone !== next.zone || flat.block !== next.block || String(flat.floor) !== next.floor) setFlatId("");
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!flatId) { toast.error("Select a flat."); return; }
    const data = new FormData(event.currentTarget);
    const from = String(data.get("move_in_date") ?? "");
    const to = String(data.get("move_out_date") ?? "");
    if (from && to && to < from) { toast.error("The end date cannot be before the start date."); return; }
    const phone = String(data.get("phone") ?? "").replace(/\D/g, "");
    const whatsapp = String(data.get("whatsapp") ?? "").replace(/\D/g, "");
    if (phone && phone.length !== 10) { toast.error("Phone number must be exactly 10 digits."); return; }
    if (whatsapp && whatsapp.length !== 10) { toast.error("WhatsApp number must be exactly 10 digits."); return; }
    setSaving(true);
    const payload = { full_name: String(data.get("full_name") ?? "").trim(), flat_id: flatId, resident_type: type, occupant_type: occupant, phone, whatsapp, email: String(data.get("email") ?? "").trim(), move_in_date: from || null, move_out_date: to || null, status: String(data.get("status") ?? "active") };
    const response = resident ? await supabase.from("residents").update(payload as never).eq("id", resident.id) : await supabase.from("residents").insert(payload as never);
    setSaving(false);
    if (response.error) { toast.error(response.error.message); return; }
    toast.success(resident ? "Resident updated." : "Resident created."); onSaved();
  }
  return <FormDialog open={open} title={resident ? "Edit Resident" : "Create Resident"} onClose={onClose}><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><FormField label="Full name" wide><Input name="full_name" required defaultValue={resident?.full_name ?? ""} /></FormField><SelectField label="Zone" value={zone} onChange={(value) => setStructure("zone", value)} options={zones} required /><SelectField label="Block" value={block} onChange={(value) => setStructure("block", value)} options={blocks} required /><SelectField label="Floor" value={floor} onChange={(value) => setStructure("floor", value)} options={floors} required /><SelectField label="Flat" value={flatId} onChange={setFlatId} options={matching.map((flat) => ({ value: flat.id, label: flat.flat_no }))} required /><SelectField label="Resident type" value={type} onChange={setType} options={["owner", "tenant"]} /><SelectField label="Occupant type" value={occupant} onChange={setOccupant} options={["family", "bachelors"]} /><FormField label="Phone"><Input name="phone" maxLength={10} inputMode="numeric" defaultValue={resident?.phone ?? ""} /></FormField><FormField label="WhatsApp"><Input name="whatsapp" maxLength={10} inputMode="numeric" defaultValue={resident?.whatsapp ?? ""} /></FormField><FormField label="Email" wide><Input name="email" type="email" defaultValue={resident?.email ?? ""} /></FormField><FormField label="Period of stay — From"><Input name="move_in_date" type="date" defaultValue={resident?.move_in_date ?? ""} /></FormField><FormField label="Period of stay — To"><Input name="move_out_date" type="date" defaultValue={resident?.move_out_date ?? ""} /></FormField><SelectField label="Status" value={resident?.status ?? "active"} name="status" options={["active", "inactive"]} /><FormActions saving={saving} editing={Boolean(resident)} onClose={onClose} /></form></FormDialog>;
}

function FlatForm({ flat, open, settings, onClose, onSaved }: { flat: Flat | null; open: boolean; settings: Settings | null; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); const data = new FormData(event.currentTarget);
    const payload = { flat_no: String(data.get("flat_no") ?? "").trim(), zone: String(data.get("zone") ?? ""), block: String(data.get("block") ?? ""), floor: Number(data.get("floor")), bedrooms: Number(data.get("bedrooms")), area_sqft: data.get("area_sqft") ? Number(data.get("area_sqft")) : null, status: String(data.get("status") ?? "vacant") };
    const response = flat ? await supabase.from("flats").update(payload as never).eq("id", flat.id) : await supabase.from("flats").insert(payload as never);
    setSaving(false); if (response.error) { toast.error(response.error.message); return; } toast.success(flat ? "Flat updated." : "Flat created."); onSaved();
  }
  const floors = settings?.floors ?? [];
  return <FormDialog open={open} title={flat ? "Edit Flat" : "Add Flat"} onClose={onClose}><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><FormField label="Flat number"><Input name="flat_no" required defaultValue={flat?.flat_no ?? ""} /></FormField><SelectField name="zone" label="Zone" initialValue={flat?.zone ?? ""} options={settings?.zones ?? []} required /><SelectField name="block" label="Block" initialValue={flat?.block ?? ""} options={settings?.blocks ?? []} required />{floors.length ? <SelectField name="floor" label="Floor" initialValue={flat ? String(flat.floor) : ""} options={floors} required /> : <FormField label="Floor"><Input name="floor" required type="number" defaultValue={flat?.floor ?? ""} /></FormField>}<FormField label="Bedrooms"><Input name="bedrooms" required type="number" min={0} defaultValue={flat?.bedrooms ?? ""} /></FormField><FormField label="Area (sq ft)"><Input name="area_sqft" type="number" min={0} defaultValue={flat?.area_sqft ?? ""} /></FormField><SelectField name="status" label="Status" initialValue={flat?.status ?? "vacant"} options={["occupied", "vacant"]} /><FormActions saving={saving} editing={Boolean(flat)} onClose={onClose} /></form></FormDialog>;
}

function VehicleForm({ vehicle, open, flats, residents, onClose, onSaved }: { vehicle: Vehicle | null; open: boolean; flats: Flat[]; residents: Resident[]; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [flatId, setFlatId] = useState(vehicle?.flat_id ?? "");
  const matchingResidents = residents.filter((resident) => resident.flat_id === flatId);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); const data = new FormData(event.currentTarget);
    const payload = { vehicle_no: String(data.get("vehicle_no") ?? "").trim().toUpperCase(), vehicle_type: String(data.get("vehicle_type") ?? "car"), make_model: String(data.get("make_model") ?? "").trim() || null, flat_id: flatId, resident_id: String(data.get("resident_id") ?? "") || null, sticker_no: String(data.get("sticker_no") ?? "").trim() || null };
    const response = vehicle ? await supabase.from("vehicles").update(payload as never).eq("id", vehicle.id) : await supabase.from("vehicles").insert(payload as never);
    setSaving(false); if (response.error) { toast.error(response.error.message); return; } toast.success(vehicle ? "Vehicle updated." : "Vehicle created."); onSaved();
  }
  return <FormDialog open={open} title={vehicle ? "Edit Vehicle" : "Add Vehicle"} onClose={onClose}><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><FormField label="Vehicle number"><Input name="vehicle_no" required defaultValue={vehicle?.vehicle_no ?? ""} /></FormField><SelectField name="vehicle_type" label="Vehicle type" initialValue={vehicle?.vehicle_type ?? "car"} options={["car", "bike", "auto", "cycle", "truck"]} /><FormField label="Make / model"><Input name="make_model" defaultValue={vehicle?.make_model ?? ""} /></FormField><SelectField label="Flat" value={flatId} onChange={setFlatId} options={flats.map((flat) => ({ value: flat.id, label: flat.flat_no }))} required /><SelectField name="resident_id" label="Resident" initialValue={vehicle?.resident_id ?? ""} options={matchingResidents.map((resident) => ({ value: resident.id, label: resident.full_name }))} allowEmpty /><FormField label="Sticker number"><Input name="sticker_no" defaultValue={vehicle?.sticker_no ?? ""} /></FormField><FormActions saving={saving} editing={Boolean(vehicle)} onClose={onClose} /></form></FormDialog>;
}

type Option = string | { value: string; label: string };
function SelectField({ label, options, value, initialValue, onChange, name, required, allowEmpty }: { label: string; options: Option[]; value?: string; initialValue?: string; onChange?: (value: string) => void; name?: string; required?: boolean; allowEmpty?: boolean }) {
  return <FormField label={label}><select name={name} value={value} defaultValue={value === undefined ? initialValue : undefined} onChange={onChange ? (event) => onChange(event.target.value) : undefined} required={required} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"><option value="">{allowEmpty ? "None" : `Select ${label.toLowerCase()}`}</option>{options.map((option) => { const item = typeof option === "string" ? { value: option, label: option } : option; return <option key={item.value} value={item.value}>{item.label}</option>; })}</select></FormField>;
}
function FormDialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) { return <Dialog open={open} onOpenChange={(next) => !next && onClose()}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>{children}</DialogContent></Dialog>; }
function FormField({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <div className={`space-y-2${wide ? " sm:col-span-2" : ""}`}><Label>{label}</Label>{children}</div>; }
function FormActions({ saving, editing, onClose }: { saving: boolean; editing: boolean; onClose: () => void }) { return <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save Changes" : "Create"}</Button></div>; }
function UploadButton({ inputRef, onFile }: { inputRef: React.RefObject<HTMLInputElement | null>; onFile: (file: File) => Promise<void> }) { return <><Button variant="outline" onClick={() => inputRef.current?.click()}><Upload className="mr-2 size-4" />Import CSV</Button><input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onFile(file); event.currentTarget.value = ""; }} /></>; }
function Toolbar({ children }: { children: React.ReactNode }) { return <div className="flex flex-wrap justify-end gap-2">{children}</div>; }
function ActionCell({ onView, onEdit, onDelete }: { onView?: () => void; onEdit: () => void; onDelete: () => void }) { return <Td right><div className="flex justify-end gap-1">{onView ? <Button size="sm" variant="outline" onClick={onView}>View</Button> : null}<Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit"><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete"><Trash2 className="size-4 text-destructive" /></Button></div></Td>; }
function Th({ children, right }: { children: React.ReactNode; right?: boolean }) { return <th className={`p-3${right ? " text-right" : ""}`}>{children}</th>; }
function Td({ children, strong, capitalize, right }: { children: React.ReactNode; strong?: boolean; capitalize?: boolean; right?: boolean }) { return <td className={`p-3${strong ? " font-medium" : ""}${capitalize ? " capitalize" : ""}${right ? " text-right" : ""}`}>{children}</td>; }
function Empty() { return <div className="p-5"><EmptyState message="No records matched these filters." /></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs uppercase text-muted-foreground">{label}</dt><dd className="mt-0.5 font-medium capitalize">{value}</dd></div>; }
function Pick({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) { return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm capitalize">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>; }