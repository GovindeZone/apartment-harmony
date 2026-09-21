import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/check-list")({ component: CheckListPage });

type FMTask = { id: string; task: string; frequency: "Daily" | "Weekly" | "Monthly" | "Quarterly" };
type MCTask = { id: string; task: string };
type FMState = Record<string, boolean>;
type MCState = Record<string, "Done" | "Not Necessary" | "">;

const FM_TASKS: FMTask[] = [
  { id: "fm-1", task: "Inspect common areas and cleanliness", frequency: "Daily" },
  { id: "fm-2", task: "Check security and access-control systems", frequency: "Daily" },
  { id: "fm-3", task: "Review housekeeping and maintenance issues", frequency: "Weekly" },
  { id: "fm-4", task: "Inspect fire-safety equipment and emergency exits", frequency: "Monthly" },
  { id: "fm-5", task: "Review preventive-maintenance plan and vendor performance", frequency: "Quarterly" },
];

const MC_TASKS: MCTask[] = [
  { id: "mc-1", task: "Meeting within MC" },
  { id: "mc-2", task: "Meeting with FM" },
  { id: "mc-3", task: "Meeting with Security" },
];

function periodKey(date: Date, frequency: FMTask["frequency"] | "Weekly") {
  const year = date.getFullYear();
  if (frequency === "Daily") return `${year}-${date.getMonth() + 1}-${date.getDate()}`;
  if (frequency === "Weekly") {
    const start = new Date(date); start.setDate(date.getDate() - date.getDay());
    return `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`;
  }
  if (frequency === "Monthly") return `${year}-${date.getMonth() + 1}`;
  return `${year}-Q${Math.floor(date.getMonth() / 3) + 1}`;
}

function CheckListPage() {
  const [tab, setTab] = useState<"fm" | "mc">("fm");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fmChecked, setFmChecked] = useState<FMState>({});
  const [mcChoices, setMcChoices] = useState<MCState>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const selectedDate = useMemo(() => new Date(`${date}T12:00:00`), [date]);

  useEffect(() => {
    try {
      setFmChecked(JSON.parse(localStorage.getItem("indus_anantya_fm_checklist") || "{}"));
      setMcChoices(JSON.parse(localStorage.getItem("indus_anantya_mc_checklist") || "{}"));
      setSubmitted(JSON.parse(localStorage.getItem("indus_anantya_checklist_submissions") || "{}"));
    } catch { /* use empty state */ }
  }, []);

  const fmKey = (task: FMTask) => `${task.id}:${periodKey(selectedDate, task.frequency)}`;
  const mcKey = (task: MCTask) => `${task.id}:${periodKey(selectedDate, "Weekly")}`;
  const save = (key: string, value: unknown, storage: string) => {
    const next = storage === "fm" ? { ...fmChecked, [key]: value as boolean } : { ...mcChoices, [key]: value as MCState[string] };
    if (storage === "fm") { setFmChecked(next as FMState); localStorage.setItem("indus_anantya_fm_checklist", JSON.stringify(next)); }
    else { setMcChoices(next as MCState); localStorage.setItem("indus_anantya_mc_checklist", JSON.stringify(next)); }
  };
  const submit = () => {
    const keys = tab === "fm" ? FM_TASKS.map(fmKey) : MC_TASKS.map(mcKey);
    const next = { ...submitted }; keys.forEach((key) => { next[key] = true; });
    setSubmitted(next); localStorage.setItem("indus_anantya_checklist_submissions", JSON.stringify(next));
  };
  const isSubmitted = (key: string) => !!submitted[key];

  return <AppShell title="Check list" description="Track facility and Management Committee checklist activities">
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 rounded-xl bg-muted p-1">
          <Button variant={tab === "fm" ? "default" : "ghost"} onClick={() => setTab("fm")}>FM Checklist</Button>
          <Button variant={tab === "mc" ? "default" : "ghost"} onClick={() => setTab("mc")}>MC Checklist</Button>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">Period date <input className="rounded-lg border bg-background px-3 py-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-4"><h2 className="text-lg font-semibold">{tab === "fm" ? "FM Checklist" : "MC Checklist"}</h2><p className="text-sm text-muted-foreground">{tab === "fm" ? "Tick each activity completed for its applicable frequency, then submit." : "Record the weekly MC activities every Sunday. Unsubmitted items remain pending."}</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b text-left"><th className="p-3">Task</th>{tab === "fm" ? <th className="p-3">Frequency</th> : <th className="p-3">Sunday date</th>}<th className="p-3">Status / action</th></tr></thead><tbody>
          {tab === "fm" ? FM_TASKS.map((task) => { const key = fmKey(task); return <tr className="border-b last:border-0" key={task.id}><td className="p-3 font-medium">{task.task}</td><td className="p-3">{task.frequency}</td><td className="p-3"><label className="flex items-center gap-3"><Checkbox checked={!!fmChecked[key]} onCheckedChange={(v) => save(key, !!v, "fm")} disabled={isSubmitted(key)} /><span className={isSubmitted(key) ? "text-emerald-600" : "text-amber-600"}>{isSubmitted(key) ? "Submitted" : fmChecked[key] ? "Ready to submit" : "Pending"}</span></label></td></tr>; }) : MC_TASKS.map((task) => { const key = mcKey(task); return <tr className="border-b last:border-0" key={task.id}><td className="p-3 font-medium">{task.task}</td><td className="p-3">{selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</td><td className="p-3"><div className="flex flex-wrap gap-2"><Button size="sm" variant={mcChoices[key] === "Done" ? "default" : "outline"} disabled={isSubmitted(key)} onClick={() => save(key, "Done", "mc")}>Done</Button><Button size="sm" variant={mcChoices[key] === "Not Necessary" ? "default" : "outline"} disabled={isSubmitted(key)} onClick={() => save(key, "Not Necessary", "mc")}>Not Necessary</Button><span className="self-center text-amber-600">{isSubmitted(key) ? "Submitted" : mcChoices[key] || "Pending"}</span></div></td></tr>; })}
        </tbody></table></div>
        <div className="mt-5 flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Items remain pending until submitted for the applicable period.</p><Button onClick={submit}>Submit checklist</Button></div>
      </div>
    </div>
  </AppShell>;
}
