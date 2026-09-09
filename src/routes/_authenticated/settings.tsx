import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { flatsQuery, settingsQuery, type Settings } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Indus Anantya Apartment" },
      {
        name: "description",
        content:
          "Configure apartment details, blocks, zones, gates, staff shifts, WhatsApp numbers and notification preferences.",
      },
      { property: "og:title", content: "Settings — Indus Anantya Apartment" },
      {
        property: "og:description",
        content: "Community configuration: blocks, zones, gates, shifts and WhatsApp setup.",
      },
    ],
  }),
  component: SettingsPage,
});

function ChipList({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (!v || values.includes(v)) return setDraft("");
    onChange([...values, v]);
    setDraft("");
  }
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {values.length ? (
          values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${v}`}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">Nothing added yet.</span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" onClick={add}>
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function SettingsPage() {
  const qc = useQueryClient();
  const settings = useQuery(settingsQuery);
  const flats = useQuery(flatsQuery);
  const [form, setForm] = useState<Settings | null>(null);

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async (next: Settings) => {
      const { error } = await supabase
        .from("apartment_settings")
        .update({
          name: next.name,
          address: next.address,
          city: next.city,
          total_flats: next.total_flats,
          blocks: next.blocks,
          zones: next.zones,
          gates: next.gates,
          shifts: next.shifts,
          helpdesk_whatsapp: next.helpdesk_whatsapp,
          manager_whatsapp: next.manager_whatsapp,
          notifications_enabled: next.notifications_enabled,
        })
        .eq("id", next.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const floors = Array.from(new Set((flats.data ?? []).map((f) => f.floor))).sort((a, b) => a - b);
  const occupied = (flats.data ?? []).filter((f) => f.status === "occupied").length;

  return (
    <AppShell
      title="Settings"
      description="Apartment configuration, gates, shifts and communication."
      actions={
        <Button disabled={!form || save.isPending} onClick={() => form && save.mutate(form)}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      {!form ? (
        <p className="text-sm text-muted-foreground">Loading configuration…</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Apartment information" description="Shown across the app.">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Community name</Label>
                <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address ?? ""}
                  onChange={(e) => set("address", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city ?? ""}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total">Total flats</Label>
                <Input
                  id="total"
                  type="number"
                  value={form.total_flats}
                  onChange={(e) => set("total_flats", Number(e.target.value))}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Structure" description="Blocks, zones and floors in the community.">
            <div className="space-y-5 p-5">
              <ChipList
                label="Blocks"
                values={form.blocks}
                onChange={(v) => set("blocks", v)}
                placeholder="Block E"
              />
              <ChipList
                label="Zones"
                values={form.zones}
                onChange={(v) => set("zones", v)}
                placeholder="East"
              />
              <div className="space-y-2">
                <Label>Floors in use</Label>
                <p className="text-sm text-muted-foreground">
                  {floors.length ? floors.join(", ") : "—"} · {occupied} of {flats.data?.length ?? 0}{" "}
                  flats occupied
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Gates & shifts" description="Used by security quick entry and staff.">
            <div className="space-y-5 p-5">
              <ChipList
                label="Gates"
                values={form.gates}
                onChange={(v) => set("gates", v)}
                placeholder="Service Gate"
              />
              <ChipList
                label="Staff shifts"
                values={form.shifts}
                onChange={(v) => set("shifts", v)}
                placeholder="General"
              />
            </div>
          </SectionCard>

          <SectionCard title="WhatsApp & notifications" description="Help desk communication setup.">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hd">Help desk WhatsApp</Label>
                <Input
                  id="hd"
                  value={form.helpdesk_whatsapp ?? ""}
                  onChange={(e) => set("helpdesk_whatsapp", e.target.value)}
                  placeholder="+91 90000 00000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mgr">Facility manager WhatsApp</Label>
                <Input
                  id="mgr"
                  value={form.manager_whatsapp ?? ""}
                  onChange={(e) => set("manager_whatsapp", e.target.value)}
                  placeholder="+91 90000 00001"
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4 sm:col-span-2">
                <div>
                  <p className="text-sm font-medium">Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Alert the team about gate activity and new help desk messages.
                  </p>
                </div>
                <Switch
                  checked={form.notifications_enabled}
                  onCheckedChange={(v) => set("notifications_enabled", v)}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Team access" description="How roles work in this workspace.">
            <div className="space-y-3 p-5 text-sm text-muted-foreground">
              <p>
                Every team member signs in with their own email. Roles — admin, manager, security
                and help desk — are stored separately from profiles so access can never be changed
                from the browser.
              </p>
              <p>
                All records live in the secure cloud database and are readable only by signed-in
                team members, keeping the log audit friendly.
              </p>
            </div>
          </SectionCard>
        </div>
      )}
    </AppShell>
  );
}
