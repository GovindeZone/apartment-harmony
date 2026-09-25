import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

const checklistTabs = ["fm", "mc", "security", "electrical", "stp", "plumbing", "housekeeping", "garden"] as const;
type ChecklistTabKey = (typeof checklistTabs)[number];
type ChecklistDepartment = "FM" | "MC" | "Security" | "Electrical" | "STP" | "Plumbing" | "House Keeping" | "Garden";
type ChecklistTask = { id: string; task: string; frequency: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly" };

export const Route = createFileRoute("/_authenticated/check-list")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: checklistTabs.includes(search["tab"] as ChecklistTabKey) ? search["tab"] as ChecklistTabKey : "fm",
  }),
  component: CheckListPage,
});

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

function periodKey(date: Date, frequency: ChecklistTask["frequency"]) {
  const year = date.getFullYear();
  if (frequency === "Daily") return `${year}-${date.getMonth() + 1}-${date.getDate()}`;
  if (frequency === "Weekly") {
    const start = new Date(date); start.setDate(date.getDate() - date.getDay());
    return `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`;
  }
  if (frequency === "Monthly") return `${year}-${date.getMonth() + 1}`;
  if (frequency === "Quarterly") return `${year}-Q${Math.floor(date.getMonth() / 3) + 1}`;
  if (frequency === "Half-Yearly") return `${year}-H${date.getMonth() < 6 ? 1 : 2}`;
  return `${year}`;
}

function CheckListPage() {
  const searchTab = Route.useSearch({ select: (search) => search.tab });
  const tabMap: Record<ChecklistTabKey, ChecklistDepartment> = { fm: "FM", mc: "MC", security: "Security", electrical: "Electrical", stp: "STP", plumbing: "Plumbing", housekeeping: "House Keeping", garden: "Garden" };
  const department = tabMap[searchTab];
  const [masterTasks, setMasterTasks] = useState<ChecklistTask[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const selectedDate = useMemo(() => new Date(`${date}T12:00:00`), [date]);

  useEffect(() => {
    try {
      setChecked(JSON.parse(localStorage.getItem(`indus_anantya_${searchTab}_checklist`) || "{}"));
      setSubmitted(JSON.parse(localStorage.getItem(`indus_anantya_${searchTab}_checklist_submissions`) || "{}"));
    } catch { setChecked({}); setSubmitted({}); }
  }, [searchTab]);

  useEffect(() => {
    const checklistTable = (supabase as unknown as { from: (name: string) => any }).from("checklist_master");
    void checklistTable.select("*").eq("active", true).eq("department", department).order("task").then(({ data }: { data: ChecklistTask[] | null }) => setMasterTasks(data ?? []));
  }, [department]);

  const save = (key: string, value: boolean) => {
    const next = { ...checked, [key]: value };
    setChecked(next); localStorage.setItem(`indus_anantya_${searchTab}_checklist`, JSON.stringify(next));
  };
  const submit = () => {
    const next = { ...submitted };
    masterTasks.forEach((task) => { next[`${task.id}:${periodKey(selectedDate, task.frequency)}`] = true; });
    setSubmitted(next); localStorage.setItem(`indus_anantya_${searchTab}_checklist_submissions`, JSON.stringify(next));
  };

  return <AppShell title={`${department} Checklist`} description={`Track ${department} checklist activities`}>
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-3"><label className="flex items-center gap-2 text-sm font-medium">Period date <input className="rounded-lg border bg-background px-3 py-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label></div>
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-4"><h2 className="text-lg font-semibold">{department} Checklist</h2><p className="text-sm text-muted-foreground">Only active checklist items configured for this department are shown.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left"><th className="p-3">Task</th><th className="p-3">Frequency</th><th className="p-3">Status / action</th></tr></thead><tbody>
          {masterTasks.map((task) => { const key = `${task.id}:${periodKey(selectedDate, task.frequency)}`; const done = !!checked[key]; const isDone = !!submitted[key]; return <tr className="border-b last:border-0" key={task.id}><td className="p-3 font-medium">{task.task}</td><td className="p-3">{task.frequency}</td><td className="p-3"><label className="flex items-center gap-3"><Checkbox checked={done} onCheckedChange={(v) => save(key, !!v)} disabled={isDone} /><span className={isDone ? "text-emerald-600" : done ? "text-amber-600" : "text-muted-foreground"}>{isDone ? "Submitted" : done ? "Ready to submit" : "Pending"}</span></label></td></tr>; })}
        </tbody></table></div>
        {!masterTasks.length && <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No active checklist items are configured for {department}.</p>}
        <div className="mt-5 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Items remain pending until submitted for the applicable period.</p><Button onClick={submit} disabled={!masterTasks.length}>Submit checklist</Button></div>
      </div>
    </div>
  </AppShell>;
}
