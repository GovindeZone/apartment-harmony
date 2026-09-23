import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/check-list")({ component: CheckListPage });

type FMTask = { id: string; task: string; frequency: "Daily" | "Weekly" | "Monthly" | "Quarterly" };
type MCTask = { id: string; task: string; frequency: "Weekly" | "Monthly" | "Yearly"; options: readonly string[] };
type FMState = Record<string, boolean>;
type MCState = Record<string, string>;

const FM_TASKS: FMTask[] = [
  { id: "fm-1", task: "Inspect common areas and cleanliness", frequency: "Daily" },
  { id: "fm-2", task: "Check security and access-control systems", frequency: "Daily" },
  { id: "fm-3", task: "Review housekeeping and maintenance issues", frequency: "Weekly" },
  { id: "fm-4", task: "Inspect fire-safety equipment and emergency exits", frequency: "Monthly" },
  { id: "fm-5", task: "Review preventive-maintenance plan and vendor performance", frequency: "Quarterly" },
];

const MC_TASKS: MCTask[] = [
  { id: "mc-1", task: "Meeting within MC", frequency: "Weekly", options: ["Done", "Not Necessary"] },
  { id: "mc-2", task: "Meeting with FM", frequency: "Weekly", options: ["Done", "Not Necessary"] },
  { id: "mc-3", task: "Meeting with Security", frequency: "Weekly", options: ["Done", "Not Necessary"] },
  { id: "mc-4", task: "Review pending Help Desk Tickets", frequency: "Weekly", options: ["Completed", "Partially Completed"] },
  { id: "mc-5", task: "Renewal of Contracts (if any)", frequency: "Monthly", options: ["Done", "Not Necessary"] },
  { id: "mc-6", task: "Renewal of Association Registration", frequency: "Yearly", options: ["Done", "Not Necessary"] },
  { id: "mc-7", task: "Update Holiday list", frequency: "Yearly", options: ["Done", "Not Necessary"] },
];

function periodKey(date: Date, frequency: FMTask["frequency"] | MCTask["frequency"]) {
  const year = date.getFullYear();
  if (frequency === "Daily") return `${year}-${date.getMonth() + 1}-${date.getDate()}`;
  if (frequency === "Weekly") {
    const start = new Date(date); start.setDate(date.getDate() - date.getDay());
    return `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`;
  }
  if (frequency === "Monthly") return `${year}-${date.getMonth() + 1}`;
  return `${year}`;
}

function CheckListPage() {
  const [tab, setTab] = useState<"FM"|"MC"|"Security"|"Electrical"|"STP"|"Plumbing"|"House Keeping"|"Garden">("FM");
  const [masterTasks, setMasterTasks] = useState<any[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fmChecked, setFmChecked] = useState<FMState>({});
  const [mcChoices, setMcChoices] = useState<MCState>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const selectedDate = useMemo(() => new Date(`${date}T12:00:00`), [date]);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    const map:any={fm:"FM",mc:"MC",security:"Security",electrical:"Electrical",stp:"STP",plumbing:"Plumbing",housekeeping:"House Keeping",garden:"Garden"};
    if (requestedTab && map[requestedTab]) setTab(map[requestedTab]);
    try {
      setFmChecked(JSON.parse(localStorage.getItem("indus_anantya_fm_checklist") || "{}"));
      setMcChoices(JSON.parse(localStorage.getItem("indus_anantya_mc_checklist") || "{}"));
      setSubmitted(JSON.parse(localStorage.getItem("indus_anantya_checklist_submissions") || "{}"));
    } catch { /* use empty state */ }
  }, []);

  useEffect(() => { void supabase.from("checklist_master").select("*").eq("active", true).eq("department", tab).order("task").then(({data}) => setMasterTasks(data || [])); }, [tab]);

  const fmKey = (task: FMTask) => `${task.id}:${periodKey(selectedDate, task.frequency)}`;
  const mcKey = (task: MCTask) => `${task.id}:${periodKey(selectedDate, task.frequency)}`;
  const save = (key: string, value: unknown, storage: "fm" | "mc") => {
    if (storage === "fm") {
      const next = { ...fmChecked, [key]: value as boolean };
      setFmChecked(next); localStorage.setItem("indus_anantya_fm_checklist", JSON.stringify(next));
    } else {
      const next = { ...mcChoices, [key]: value as string };
      setMcChoices(next); localStorage.setItem("indus_anantya_mc_checklist", JSON.stringify(next));
    }
  };
  const submit = () => {
    const keys = displayTasks.map((t:any) => `${t.id}:${periodKey(selectedDate,t.frequency)}`);
    const next = { ...submitted }; keys.forEach((key) => { next[key] = true; });
    setSubmitted(next); localStorage.setItem("indus_anantya_checklist_submissions", JSON.stringify(next));
  };
  const isSubmitted = (key: string) => !!submitted[key];
  const displayTasks = masterTasks;

  return <AppShell title="Checklists" description="Track facility and Management Committee checklist activities">
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 rounded-xl bg-muted p-1">
          <Button variant={tab === "fm" ? "default" : "ghost"} onClick={() => setTab("fm")}>FM Checklist</Button>
          <Button variant={tab === "mc" ? "default" : "ghost"} onClick={() => setTab("mc")}>MC Checklist</Button>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">Period date <input className="rounded-lg border bg-background px-3 py-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-4"><h2 className="text-lg font-semibold">{tab} Checklist</h2><p className="text-sm text-muted-foreground">Only active checklist items configured for this department are shown.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left"><th className="p-3">Task</th>{tab === "fm" ? <th className="p-3">Frequency</th> : <th className="p-3">Applicable period</th>}<th className="p-3">Status / action</th></tr></thead><tbody>
{displayTasks.map((task:any) => { const key = `${task.id}:${periodKey(selectedDate, task.frequency)}`; return <tr className="border-b last:border-0" key={task.id}><td className="p-3 font-medium">{task.task}</td><td className="p-3">{task.frequency}</td><td className="p-3"><label className="flex items-center gap-3"><Checkbox checked={!!fmChecked[key]} onCheckedChange={(v) => save(key, !!v, "fm")} disabled={isSubmitted(key)} /><span className={isSubmitted(key) ? "text-emerald-600" : "text-amber-600"}>{isSubmitted(key) ? "Submitted" : fmChecked[key] ? "Ready to submit" : "Pending"}</span></label></td></tr>; })}
        </tbody></table></div>
        <div className="mt-5 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Items remain pending until submitted for the applicable period.</p><Button onClick={submit}>Submit checklist</Button></div>
      </div>
    </div>
  </AppShell>;
}
