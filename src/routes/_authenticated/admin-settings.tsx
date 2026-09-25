import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery, type Settings } from "@/lib/api";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-settings")({
  component: AdminSettingsPage,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
});

type StructureKey = "zones" | "blocks" | "floors" | "gates";

function AdminSettingsPage() {
  const [value, setValue] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("apartment_settings").select("*").limit(1).maybeSingle();
    if (error) toast.error(error.message);
    setValue(data as Settings | null);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function save(next: Settings) {
    setSaving(true);
    const { id, ...payload } = next;
    const { error } = await supabase.from("apartment_settings").update(payload as never).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setValue(next);
    toast.success("Apartment structure saved.");
  }

  function updateList(key: StructureKey, items: string[]) {
    if (!value) return;
    setValue({ ...value, [key]: items } as Settings);
  }

  async function addItem(key: StructureKey) {
    if (!value) return;
    const label = window.prompt(`Enter new ${key === "floors" ? "floor" : key.slice(0, -1)}:`)?.trim();
    if (!label) return;
    const current = (value[key] ?? []) as string[];
    if (current.some((x) => x.toLowerCase() === label.toLowerCase())) {
      toast.error("This item already exists.");
      return;
    }
    await save({ ...value, [key]: [...current, label] } as Settings);
  }

  async function editItem(key: StructureKey, index: number) {
    if (!value) return;
    const current = [...((value[key] ?? []) as string[])];
    const next = window.prompt("Edit value:", current[index])?.trim();
    if (!next || next === current[index]) return;
    if (current.some((x, i) => i !== index && x.toLowerCase() === next.toLowerCase())) {
      toast.error("This item already exists.");
      return;
    }
    current[index] = next;
    await save({ ...value, [key]: current } as Settings);
  }

  async function removeItem(key: StructureKey, index: number) {
    if (!value) return;
    const current = [...((value[key] ?? []) as string[])];
    if (!window.confirm(`Remove ${current[index]} from the apartment structure?`)) return;
    current.splice(index, 1);
    await save({ ...value, [key]: current } as Settings);
  }

  if (loading) return <AppShell title="Admin · Profile">Loading…</AppShell>;
  if (!value) return <AppShell title="Admin · Profile"><SectionCard title="Apartment Profile"><p>No apartment settings record found.</p></SectionCard></AppShell>;

  return (
    <AppShell title="Admin · Profile" description="Apartment profile and editable physical structure">
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Apartment Profile" description="Basic property information">
          <div className="grid gap-4">
            <Field label="Apartment name" value={value.name} onChange={(name) => setValue({ ...value, name })} />
            <Field label="Address" value={value.address ?? ""} onChange={(address) => setValue({ ...value, address })} />
            <Field label="City" value={value.city ?? ""} onChange={(city) => setValue({ ...value, city })} />
            <div className="space-y-2">
              <Label>Total flats</Label>
              <Input
                type="number"
                min={0}
                value={value.total_flats}
                onChange={(e) => setValue({ ...value, total_flats: Math.max(0, Number(e.target.value) || 0) })}
              />
              <p className="text-xs text-muted-foreground">This is the configured apartment capacity. Flat records can then use the same Zone, Block and Floor structure.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Apartment Structure" description="Create, edit or remove the master values used throughout the application">
          <div className="space-y-5">
            <StructureList title="Zones" items={value.zones ?? []} onAdd={() => void addItem("zones")} onEdit={(i) => void editItem("zones", i)} onRemove={(i) => void removeItem("zones", i)} />
            <StructureList title="Blocks" items={value.blocks ?? []} onAdd={() => void addItem("blocks")} onEdit={(i) => void editItem("blocks", i)} onRemove={(i) => void removeItem("blocks", i)} />
            <StructureList title="Floors" items={value.floors ?? []} onAdd={() => void addItem("floors")} onEdit={(i) => void editItem("floors", i)} onRemove={(i) => void removeItem("floors", i)} />
            <StructureList title="Gates" items={value.gates ?? []} onAdd={() => void addItem("gates")} onEdit={(i) => void editItem("gates", i)} onRemove={(i) => void removeItem("gates", i)} />
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={() => void save(value)} disabled={saving}>
          {saving ? "Saving…" : "Save Apartment Profile"}
        </Button>
      </div>

      <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Resident linkage:</strong> Resident records use the apartment flat master. The selected flat automatically carries its Zone, Block and Floor into resident details, keeping the apartment structure consistent.
      </div>
    </AppShell>
  );
}

function StructureList({ title, items, onAdd, onEdit, onRemove }: { title: string; items: string[]; onAdd: () => void; onEdit: (index: number) => void; onRemove: (index: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <Label className="font-semibold">{title}</Label>
        <Button size="sm" variant="outline" onClick={onAdd}><Plus className="mr-1 size-4" />Add</Button>
      </div>
      {items.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2">
              <span className="min-w-0 truncate text-sm font-medium">{item}</span>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" className="size-8" onClick={() => onEdit(index)} aria-label={`Edit ${title} ${item}`}><Pencil className="size-4" /></Button>
                <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => onRemove(index)} aria-label={`Remove ${title} ${item}`}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No {title.toLowerCase()} configured. Use Add to create one.</p>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Input value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}
