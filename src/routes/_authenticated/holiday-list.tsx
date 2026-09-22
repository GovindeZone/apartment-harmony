import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/holiday-list")({ component: HolidayListPage });

const HOLIDAYS = ["New Year","Christmas","Pongal Festival","Ayudha Pooja","Independence Day","Republic Day"];

function HolidayListPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [dates, setDates] = useState<Record<string,string>>({});
  useEffect(() => { try { setDates(JSON.parse(localStorage.getItem("indus_anantya_holidays") || "{}")); } catch {} }, []);
  const save = () => { localStorage.setItem("indus_anantya_holidays", JSON.stringify(dates)); toast.success("Holiday list saved."); };
  return <AppShell title="Holiday List" description="Set and maintain staff holidays for each year">
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3"><CalendarDays className="size-5 text-primary"/><div><h2 className="font-semibold">Holiday List — {year}</h2><p className="text-sm text-muted-foreground">Enter the holiday date and save the list.</p></div></div>
      <div className="mb-4"><label className="text-sm font-medium">Year</label><Input type="number" className="mt-1 max-w-40" value={year} onChange={e=>setYear(Number(e.target.value))}/></div>
      <div className="grid gap-3 md:grid-cols-2">
        {HOLIDAYS.map(name => <div key={name} className="flex items-center justify-between gap-4 rounded-xl border p-4"><span className="font-medium">{name}</span><Input className="w-40" type="date" value={dates[year+"-"+name] || ""} onChange={e=>setDates({...dates,[year+"-"+name]:e.target.value})}/></div>)}
      </div>
      <div className="mt-5 flex justify-end"><Button onClick={save} className="gap-2"><Save className="size-4"/> Save Holiday List</Button></div>
    </div>
  </AppShell>;
}
