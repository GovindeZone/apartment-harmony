import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Phone, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SectionCard, StatCard, StatusBadge, EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { helpdeskQuery, residentsQuery, settingsQuery, type Resident } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/helpdesk")({
  head: () => ({
    meta: [
      { title: "Help Desk — Indus Anantya Apartment" },
      {
        name: "description",
        content:
          "Contact residents and the facility manager over WhatsApp and keep a record of every community conversation.",
      },
      { property: "og:title", content: "Help Desk — Indus Anantya Apartment" },
      {
        property: "og:description",
        content: "WhatsApp-first resident communication with a full conversation log.",
      },
    ],
  }),
  component: HelpdeskPage,
});

const CATEGORIES = ["general", "maintenance", "complaint", "security", "billing", "visitor"];

const waLink = (num: string | null | undefined, text: string) =>
  num ? `https://wa.me/${num.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}` : "#";

function HelpdeskPage() {
  const qc = useQueryClient();
  const residents = useQuery(residentsQuery);
  const records = useQuery(helpdeskQuery);
  const settings = useQuery(settingsQuery);

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Resident | null>(null);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return (residents.data ?? []).slice(0, 8);
    return (residents.data ?? [])
      .filter((r) =>
        [r.full_name, r.phone ?? "", r.whatsapp ?? "", r.flats?.flat_no ?? ""].some((v) =>
          v.toLowerCase().includes(needle),
        ),
      )
      .slice(0, 12);
  }, [residents.data, q]);

  const history = (records.data ?? []).filter(
    (r) => !selected || r.resident_id === selected.id,
  );

  const log = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a resident first");
      if (!message.trim()) throw new Error("Write a message to record");
      const { error } = await supabase.from("helpdesk_records").insert({
        resident_id: selected.id,
        flat_no: selected.flats?.flat_no ?? null,
        resident_whatsapp: selected.whatsapp,
        helpdesk_whatsapp: settings.data?.helpdesk_whatsapp ?? null,
        manager_whatsapp: settings.data?.manager_whatsapp ?? null,
        direction: "outbound",
        category,
        message: message.trim(),
        status: "open",
      } as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Conversation recorded");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["helpdesk"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const close = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("helpdesk_records")
        .update({ status: "closed" } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Marked closed");
      qc.invalidateQueries({ queryKey: ["helpdesk"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const open = (records.data ?? []).filter((r) => r.status === "open").length;

  return (
    <AppShell title="Help Desk" description="Resident communication over WhatsApp">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Conversations" value={records.data?.length ?? 0} icon={MessageSquare} />
        <StatCard label="Open" value={open} tone="warning" />
        <StatCard
          label="Help desk number"
          value={settings.data?.helpdesk_whatsapp ?? "—"}
          icon={Phone}
          tone="success"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[340px_1fr]">
        <SectionCard title="Find resident">
          <div className="space-y-3 p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, flat, phone or WhatsApp"
                className="h-11 pl-9"
              />
            </div>
            <div className="max-h-[420px] space-y-1 overflow-y-auto">
              {matches.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(r)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
                    selected?.id === r.id ? "bg-primary/10 text-primary" : ""
                  }`}
                >
                  <span className="block font-medium">{r.full_name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {r.flats?.flat_no ?? "—"} · {r.resident_type} · {r.whatsapp ?? "no WhatsApp"}
                  </span>
                </button>
              ))}
              {matches.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No resident matched that search.
                </p>
              ) : null}
            </div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title={selected ? selected.full_name : "Select a resident"}
            description={
              selected
                ? `${selected.flats?.flat_no ?? "—"} · ${selected.resident_type} · ${selected.whatsapp ?? "no WhatsApp"}`
                : "Pick someone from the list to start a conversation"
            }
          >
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="gap-2"
                  disabled={!selected?.whatsapp}
                >
                  <a
                    href={waLink(selected?.whatsapp, `Hello ${selected?.full_name ?? ""}, this is the Ashvale help desk.`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageSquare className="size-4" /> WhatsApp resident
                  </a>
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <a
                    href={waLink(
                      settings.data?.manager_whatsapp,
                      `Facility manager, help desk update for flat ${selected?.flats?.flat_no ?? "—"}.`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageSquare className="size-4" /> WhatsApp manager
                  </a>
                </Button>
                {selected?.phone ? (
                  <Button asChild variant="ghost" className="gap-2">
                    <a href={`tel:${selected.phone}`}>
                      <Phone className="size-4" /> Call {selected.phone}
                    </a>
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Conversation note</Label>
                  <Textarea
                    id="message"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What was discussed or requested?"
                  />
                </div>
              </div>
              <Button className="gap-2" onClick={() => log.mutate()} disabled={log.isPending}>
                <Send className="size-4" /> {log.isPending ? "Saving…" : "Record conversation"}
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Communication history"
            description={selected ? `Records for ${selected.full_name}` : "All recorded conversations"}
            actions={
              selected ? (
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  Show all
                </Button>
              ) : null
            }
          >
            {history.length === 0 ? (
              <div className="p-5">
                <EmptyState message="No conversations recorded yet." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Flat</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString("en-IN")}
                        </TableCell>
                        <TableCell>{r.flat_no ?? "—"}</TableCell>
                        <TableCell className="capitalize">{r.category}</TableCell>
                        <TableCell className="capitalize">{r.direction}</TableCell>
                        <TableCell className="max-w-[320px] truncate">{r.message}</TableCell>
                        <TableCell>
                          <StatusBadge value={r.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          {r.status !== "closed" ? (
                            <Button size="sm" variant="outline" onClick={() => close.mutate(r.id)}>
                              Close
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Done</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
