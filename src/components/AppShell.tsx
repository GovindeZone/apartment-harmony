import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, Users, ShieldCheck, MessageSquare, Home, FileBarChart, Settings as SettingsIcon, Menu, LogOut, Building2, Shield, CalendarCheck, FileText, UsersRound, Vote, ClipboardList, BookOpenCheck, Boxes, BookOpen, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/facility-management", label: "Facility Management", icon: ClipboardList, group: [
    { to: "/attendance", label: "Attendance", icon: CalendarCheck },
    { to: "/security", label: "Security", icon: ShieldCheck },
    { to: "/asset-management", label: "Asset Management", icon: Boxes },
    { to: "/check-list", label: "FM Checklist", icon: ListChecks },
    { to: "/helpdesk", label: "Help Desk", icon: MessageSquare },
  ]},
  { to: "/mc-master", label: "MC Master", icon: UsersRound, group: [
    { to: "/staff", label: "Staff", icon: Users },
    { to: "/official-records", label: "Official Records", icon: FileText },
        { to: "/contractor", label: "Contractor", icon: Building2 },
    { to: "/checklist-master", label: "Check list master", icon: ListChecks },
    { to: "/integration-master", label: "Integration Master", icon: SettingsIcon },
    { to: "/holiday-list", label: "Holiday List", icon: CalendarCheck },
    { to: "/residents", label: "Residents", icon: Home },
  ]},
  { to: "/repositories", label: "Repositories", icon: BookOpenCheck, group: [
    { to: "/mc-repository", label: "MC Repository", icon: UsersRound },
    { to: "/ec-repository", label: "EC Repository", icon: Vote },
    { to: "/bye-law-repository", label: "Bye-Law Repository", icon: BookOpenCheck },
    { to: "/mc-handbook", label: "MC Handbook", icon: BookOpen },
  ]},
  { to: "/checklists", label: "Checklists", icon: ListChecks, group: [
    { to: "/check-list?tab=fm", label: "FM Checklist", icon: ListChecks },
    { to: "/check-list?tab=mc", label: "MC Checklist", icon: ListChecks },
  ]},
  { to: "/reports", label: "Reports", icon: FileBarChart },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return <nav className="flex flex-col gap-1">
    {NAV.map((item) => {
      if ("group" in item && item.group) {
        return <div key={item.to}>
          <div className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-sidebar-foreground">
            <item.icon className="size-[18px] shrink-0" />{item.label}
          </div>
          <div className="ml-3 mt-0.5 border-l border-border/60 pl-2">
            {item.group.map((child) => <Link key={child.to + child.label} to={child.to} onClick={onNavigate} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" activeProps={{ className: "bg-sidebar-primary/10 text-sidebar-primary font-semibold" }}>
              <child.icon className="size-4 shrink-0" />{child.label}
            </Link>)}
          </div>
        </div>;
      }
      const destination = item.to === "/dashboard" ? "/dashboard" : "/reports";
      return <Link key={item.to} to={destination} onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" activeProps={{ className: "bg-sidebar-primary/12 text-sidebar-primary font-semibold" }}>
        <item.icon className="size-[18px] shrink-0" />{item.label}
      </Link>;
    })}
    <div className="mt-3 border-t border-border/60 pt-3"><div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Admin</div><Link to="/admin" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent" activeProps={{ className: "bg-sidebar-primary/12 text-sidebar-primary font-semibold" }}><Shield className="size-[18px] shrink-0" />Admin</Link><Link to="/admin-settings" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-2.5 pl-10 text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent" activeProps={{ className: "text-sidebar-primary font-semibold" }}><SettingsIcon className="size-4" />Settings</Link><Link to="/user-management" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-2.5 pl-10 text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent" activeProps={{ className: "text-sidebar-primary font-semibold" }}><Users className="size-4" />User Management</Link><Link to="/admin-user-rights" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-2.5 pl-10 text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent" activeProps={{ className: "text-sidebar-primary font-semibold" }}><ShieldCheck className="size-4" />User Rights</Link></div>
  </nav>;
}
function Brand(){return <div className="flex items-center gap-3 px-2 py-1"><span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary"><Building2 className="size-5"/></span><span className="leading-tight"><span className="block text-sm font-semibold text-foreground">Indus Anantya Apartment</span><span className="block text-xs text-muted-foreground">Facility Operations</span></span></div>}
export function AppShell({title,description,actions,children}:{title:string;description?:string;actions?:React.ReactNode;children:React.ReactNode}){
 const [open,setOpen]=useState(false); const router=useRouter();
 async function signOut(){if(!window.confirm("Are you sure you want to log out?"))return;await supabase.auth.signOut();router.navigate({to:"/auth"});}
 return <div className="min-h-screen bg-background"><aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-border bg-sidebar p-4 lg:flex"><div className="flex flex-col gap-6"><Brand/><NavLinks/></div></aside><div className="lg:pl-64"><header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:px-6"><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="outline" size="icon" className="lg:hidden"><Menu className="size-5"/><span className="sr-only">Open navigation</span></Button></SheetTrigger><SheetContent side="left" className="w-72 bg-sidebar p-4"><SheetTitle className="sr-only">Navigation</SheetTitle><div className="flex h-full flex-col justify-between"><div className="flex flex-col gap-6 pt-6"><Brand/><NavLinks onNavigate={()=>setOpen(false)}/></div></div></SheetContent></Sheet><div className="min-w-0 flex-1"><h1 className="truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">{title}</h1>{description?<p className="truncate text-xs text-muted-foreground md:text-sm">{description}</p>:null}</div>{actions?<div className="flex items-center gap-2">{actions}</div>:null}<div className="ml-auto"><Button variant="ghost" size="sm" className="gap-2" onClick={signOut}><LogOut className="size-[18px]"/>Sign out</Button></div></header><main className={cn("mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8")}>{children}</main></div></div>;
}