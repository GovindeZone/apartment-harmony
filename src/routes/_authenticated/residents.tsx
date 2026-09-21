import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, KeyRound, Search, Users, Pencil } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionCard, StatCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  familyQuery,
  flatsQuery,
  residentsQuery,
  vehiclesQuery,
  type Resident,
} from "@/lib/api";

export const Route = createFileRoute("/_authenticated/residents")({
  head: () => ({
    meta: [
      { title: "Residents — Indus Anantya Apartment" },
      {
        name: "description",
        content:
          "Resident and flat directory with owner/tenant filters, family members, vehicles and contact details.",
      },
      { property: "og:title", content: "Residents — Indus Anantya Apartment" },
      {
        property: "og:description",
        content: "Searchable resident, flat and vehicle directory for the community.",
      },
    ],
  }),
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
  const [editingTenant, setEditingTenant] = useState<Resident | null>(null);

  const blocks = useMemo(
    () => Array.from(new Set((flats.data ?? []).map((f) => f.block))).sort(),
    [flats.data],
  );
  const zones = useMemo(
    () => Array.from(new Set((flats.data ?? []).map((f) => f.zone))).sort(),
    [flats.data],
  );

  const needle = q.trim().toLowerCase();
  const vehicleByResident = new Map<string, string[]>();
  for (const v of vehicles.data ?? []) {
    if (!v.resident_id) continue;
    vehicleByResident.set(v.resident_id, [
      ...(vehicleByResident.get(v.resident_id) ?? []),
      v.vehicle_no,
    ]);
  }

  const residentRows = (residents.data ?? []).filter((r) => {
    const vehiclesText = (vehicleByResident.get(r.id) ?? []).join(" ");
    const match =
      !needle ||
      [
        r.full_name,
        r.phone ?? "",
        r.whatsapp ?? "",
        r.email ?? "",
        r.flats?.flat_no ?? "",
        vehiclesText,
      ].some((v) => v.toLowerCase().includes(needle));
    return (
      match &&
      (type === "all" || r.resident_type === type) &&
      (block === "all" || r.flats?.block === block) &&
      (zone === "all" || r.flats?.zone === zone)
    );
  });

  const flatRows = (flats.data ?? []).filter(
    (f) =>
      (!needle || [f.flat_no, f.block, f.zone].some((v) => v.toLowerCase().includes(needle))) &&
      (block === "all" || f.block === block) &&
      (zone === "all" || f.zone === zone),
  );

  const vehicleRows = (vehicles.data ?? []).filter(
    (v) =>
      !needle ||
      [v.vehicle_no, v.make_model ?? "", v.flats?.flat_no ?? "", v.residents?.full_name ?? ""].some(
        (t) => t.toLowerCase().includes(needle),
      ),
  );

  const owners = (residents.data ?? []).filter((r) => r.resident_type === "owner").length;
  const tenants = (residents.data ?? []).filter((r) => r.resident_type === "tenant").length;
  const occupied = (flats.data ?? []).filter((f) => f.status === "occupied").length;

  return (
    <AppShell title="Residents" description="Directory of residents, flats and vehicles">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Residents" value={residents.data?.length ?? 0} icon={Users} />
        <StatCard label="Owners" value={owners} icon={KeyRound} tone="success" />
        <StatCard label="Tenants" value={tenants} icon={Home} />
        <StatCard
          label="Occupied flats"
          value={`${occupied}/${flats.data?.length ?? 0}`}
          tone="warning"
        />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, flat, phone, WhatsApp or vehicle"
            className="h-11 pl-9"
          />
        </div>
        <Pick value={type} onChange={setType} options={["all", "owner", "tenant"]} />
        <Pick value={block} onChange={setBlock} options={["all", ...blocks]} />
        <Pick value={zone} onChange={setZone} options={["all", ...zones]} />
      </div>

      <Tabs defaultValue="residents" className="mt-6">
        <TabsList>
          <TabsTrigger value="residents">Residents</TabsTrigger>
          <TabsTrigger value="flats">Flat directory</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
        </TabsList>

        <TabsContent value="residents" className="mt-4">
          <SectionCard title={`${residentRows.length} residents`}>
            {residentRows.length === 0 ? (
              <div className="p-5">
                <EmptyState message="No residents matched these filters." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Flat</TableHead>
                      <TableHead>Block / Zone</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {residentRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.full_name}</TableCell>
                        <TableCell>{r.flats?.flat_no ?? "—"}</TableCell>
                        <TableCell>
                          {r.flats ? `${r.flats.block} · ${r.flats.zone}` : "—"}
                        </TableCell>
                        <TableCell className="capitalize">{r.resident_type}</TableCell>
                        <TableCell>{r.phone ?? "—"}</TableCell>
                        <TableCell>
                          <StatusBadge value={r.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
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

        <TabsContent value="flats" className="mt-4">
          <SectionCard title={`${flatRows.length} flats`}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flat</TableHead>
                    <TableHead>Block</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Bedrooms</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flatRows.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.flat_no}</TableCell>
                      <TableCell>{f.block}</TableCell>
                      <TableCell>{f.zone}</TableCell>
                      <TableCell>{f.floor}</TableCell>
                      <TableCell>{f.bedrooms} BHK</TableCell>
                      <TableCell>{f.area_sqft ? `${f.area_sqft} sq ft` : "—"}</TableCell>
                      <TableCell>
                        <StatusBadge value={f.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="vehicles" className="mt-4">
          <SectionCard title={`${vehicleRows.length} vehicles`}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle no</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Make / model</TableHead>
                    <TableHead>Flat</TableHead>
                    <TableHead>Resident</TableHead>
                    <TableHead>Sticker</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleRows.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.vehicle_no}</TableCell>
                      <TableCell className="capitalize">{v.vehicle_type}</TableCell>
                      <TableCell>{v.make_model ?? "—"}</TableCell>
                      <TableCell>{v.flats?.flat_no ?? "—"}</TableCell>
                      <TableCell>{v.residents?.full_name ?? "—"}</TableCell>
                      <TableCell>{v.sticker_no ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <ResidentDialog resident={selected} onClose={() => setSelected(null)} />
      <TenantEditDialog resident={editingTenant} onClose={() => setEditingTenant(null)} onSaved={() => { setEditingTenant(null); qc.invalidateQueries({ queryKey: ["residents"] }); }} />
    </AppShell>
  );
}

function ResidentDialog({
  resident,
  onClose,
}: {
  resident: Resident | null;
  onClose: () => void;
}) {
  const family = useQuery({ ...familyQuery(resident?.id ?? ""), enabled: !!resident });
  const vehicles = useQuery(vehiclesQuery);
  const owned = (vehicles.data ?? []).filter((v) => v.resident_id === resident?.id);

  return (
    <Dialog open={!!resident} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{resident?.full_name}</DialogTitle>
        </DialogHeader>
        {resident ? (
          <div className="space-y-5 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <Info label="Flat" value={resident.flats?.flat_no ?? "—"} />
              <Info
                label="Block / Zone"
                value={resident.flats ? `${resident.flats.block} · ${resident.flats.zone}` : "—"}
              />
              <Info label="Floor" value={String(resident.flats?.floor ?? "—")} />
              <Info label="Type" value={resident.resident_type} />
              <Info label="Phone" value={resident.phone ?? "—"} />
              <Info label="WhatsApp" value={resident.whatsapp ?? "—"} />
              <Info label="Email" value={resident.email ?? "—"} />
              <Info label="Moved in" value={resident.move_in_date ?? "—"} />
              <Info label="Moves out" value={resident.move_out_date ?? "—"} />
              <Info label="Status" value={resident.status} />
            </dl>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Family members
              </h3>
              {(family.data ?? []).length === 0 ? (
                <p className="text-muted-foreground">No family members on record.</p>
              ) : (
                <ul className="space-y-1">
                  {(family.data ?? []).map((m) => (
                    <li key={m.id} className="flex justify-between gap-3">
                      <span className="font-medium">{m.full_name}</span>
                      <span className="text-muted-foreground">
                        {m.relation ?? "—"} {m.age ? `· ${m.age} yrs` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Vehicles
              </h3>
              {owned.length === 0 ? (
                <p className="text-muted-foreground">No vehicles registered.</p>
              ) : (
                <ul className="space-y-1">
                  {owned.map((v) => (
                    <li key={v.id} className="flex justify-between gap-3">
                      <span className="font-medium">{v.vehicle_no}</span>
                      <span className="capitalize text-muted-foreground">
                        {v.vehicle_type} {v.make_model ? `· ${v.make_model}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize text-foreground">{value}</dd>
    </div>
  );
}

function Pick({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function TenantEditDialog({resident,onClose,onSaved}:{resident:Resident|null;onClose:()=>void;onSaved:()=>void}){
 const [saving,setSaving]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!resident)return;setSaving(true);const f=new FormData(e.currentTarget);const phone=String(f.get("phone")??"").replace(/\D/g,"");if(phone && !/^\d{10}$/.test(phone)){toast.error("Phone number must be exactly 10 digits.");setSaving(false);return}const {error}=await supabase.from("residents").update({full_name:String(f.get("full_name")??"").trim(),phone,whatsapp:String(f.get("whatsapp")??"").replace(/\D/g,""),email:String(f.get("email")??"").trim(),status:String(f.get("status")??"active"),move_in_date:String(f.get("move_in_date")??"")||null,move_out_date:String(f.get("move_out_date")??"")||null} as never).eq("id",resident.id);if(error)toast.error(error.message);else{toast.success("Tenant details updated");onSaved()}setSaving(false)}
 return <Dialog open={!!resident} onOpenChange={v=>!v&&onClose()}><DialogContent><DialogHeader><DialogTitle>Edit Tenant</DialogTitle></DialogHeader>{resident?<form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}><div className="space-y-2 sm:col-span-2"><Label>Full name</Label><Input name="full_name" required defaultValue={resident.full_name}/></div><div className="space-y-2"><Label>Phone (10 digits)</Label><Input name="phone" required maxLength={10} pattern="[0-9]{10}" inputMode="numeric" defaultValue={resident.phone??""}/></div><div className="space-y-2"><Label>WhatsApp (10 digits)</Label><Input name="whatsapp" maxLength={10} pattern="[0-9]{10}" inputMode="numeric" defaultValue={resident.whatsapp??""}/></div><div className="space-y-2 sm:col-span-2"><Label>Email</Label><Input name="email" type="email" defaultValue={resident.email??""}/></div><div className="space-y-2"><Label>Move-in date</Label><Input name="move_in_date" type="date" defaultValue={resident.move_in_date??""}/></div><div className="space-y-2"><Label>Move-out date</Label><Input name="move_out_date" type="date" defaultValue={resident.move_out_date??""}/></div><div className="space-y-2"><Label>Status</Label><select name="status" defaultValue={resident.status} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="active">active</option><option value="inactive">inactive</option></select></div><div className="sm:col-span-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving?"Saving…":"Save Tenant"}</Button></div></form>:null}</DialogContent></Dialog>
}
