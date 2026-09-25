import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  MessageSquare,
  Home,
  FileBarChart,
  Settings as SettingsIcon,
  Menu,
  LogOut,
  Building2,
  Shield,
  CalendarCheck,
  FileText,
  UsersRound,
  Vote,
  ClipboardList,
  BookOpenCheck,
  Boxes,
  BookOpen,
  ListChecks,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    to: "/facility-management",
    label: "Facility Management",
    icon: ClipboardList,
    group: [
      { to: "/attendance", label: "Attendance", icon: CalendarCheck },
      { to: "/security", label: "Security", icon: ShieldCheck },
      { to: "/asset-management", label: "Asset Management", icon: Boxes },
      { to: "/helpdesk", label: "Help Desk", icon: MessageSquare },
    ],
  },
  {
    to: "/mc-master",
    label: "MC Master",
    icon: UsersRound,
    group: [
      { to: "/staff", label: "Staff", icon: Users },
      { to: "/official-records", label: "Official Records", icon: FileText },
      { to: "/contractor", label: "Contractor", icon: Building2 },
      { to: "/checklist-master", label: "Checklist Master", icon: ListChecks },
      { to: "/holiday-list", label: "Holiday List", icon: CalendarCheck },
      { to: "/residents", label: "Residents", icon: Home },
    ],
  },
  {
    to: "/checklists",
    label: "Checklists",
    icon: ListChecks,
    group: [
      { to: "/check-list", tab: "fm", label: "FM Checklist", icon: ListChecks },
      { to: "/check-list", tab: "mc", label: "MC Checklist", icon: ListChecks },
      { to: "/check-list", tab: "security", label: "Security Checklist", icon: ShieldCheck },
      { to: "/check-list", tab: "electrical", label: "Electrical Checklist", icon: SettingsIcon },
      { to: "/check-list", tab: "stp", label: "STP Checklist", icon: ListChecks },
      { to: "/check-list", tab: "plumbing", label: "Plumbing Checklist", icon: ListChecks },
      { to: "/check-list", tab: "housekeeping", label: "House Keeping Checklist", icon: Home },
      { to: "/check-list", tab: "garden", label: "Garden Checklist", icon: ListChecks },
    ],
  },
  { to: "/reports", label: "Reports", icon: FileBarChart },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        if ("group" in item && item.group) {
          return (
            <div key={item.to}>
              <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-sidebar-foreground">
                <item.icon className="size-[18px] shrink-0" />
                <span>{item.label}</span>
              </div>
              <div className="ml-3 mt-0.5 border-l border-border/60 pl-2">
                {item.group.map((child) =>
                  "tab" in child ? (
                    <Link
                      key={child.tab}
                      to="/check-list"
                      search={{ tab: child.tab }}
                      onClick={onNavigate}
                      className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeProps={{ className: "bg-sidebar-primary/10 text-sidebar-primary font-semibold" }}
                    >
                      <child.icon className="size-4 shrink-0" />
                      <span>{child.label}</span>
                    </Link>
                  ) : (
                    <Link
                      key={child.to + child.label}
                      to={child.to}
                      onClick={onNavigate}
                      className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeProps={{ className: "bg-sidebar-primary/10 text-sidebar-primary font-semibold" }}
                    >
                      <child.icon className="size-4 shrink-0" />
                      <span>{child.label}</span>
                    </Link>
                  ),
                )}
              </div>
            </div>
          );
        }

        const destination = item.to === "/dashboard" ? "/dashboard" : "/reports";
        return (
          <Link
            key={item.to}
            to={destination}
            onClick={onNavigate}
            className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-primary/12 text-sidebar-primary font-semibold" }}
          >
            <item.icon className="size-[18px] shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <div className="mt-3 border-t border-border/60 pt-3">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Admin
        </div>
        <Link
          to="/admin"
          onClick={onNavigate}
          className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent"
          activeProps={{ className: "bg-sidebar-primary/12 text-sidebar-primary font-semibold" }}
        >
          <Shield className="size-[18px] shrink-0" />
          <span>Admin</span>
        </Link>
        <div className="ml-3 mt-1 border-l border-border/60 pl-2">
          <Link to="/admin-settings" onClick={onNavigate} className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent" activeProps={{ className: "text-sidebar-primary font-semibold" }}>
            <SettingsIcon className="size-4" /><span>Profile</span>
          </Link>
          <Link to="/user-management" onClick={onNavigate} className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent" activeProps={{ className: "text-sidebar-primary font-semibold" }}>
            <Users className="size-4" /><span>User Management</span>
          </Link>
          <Link to="/audit-log" onClick={onNavigate} className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent" activeProps={{ className: "text-sidebar-primary font-semibold" }}>
            <ShieldCheck className="size-4" /><span>Security Audit</span>
          </Link>
          <Link to="/admin-user-rights" onClick={onNavigate} className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent" activeProps={{ className: "text-sidebar-primary font-semibold" }}>
            <ShieldCheck className="size-4" /><span>User Rights</span>
          </Link>
          <Link to="/integration-master" onClick={onNavigate} className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent" activeProps={{ className: "text-sidebar-primary font-semibold" }}>
            <SettingsIcon className="size-4" /><span>App Integration</span>
          </Link>
        </div>
        <div className="mt-2 ml-3 border-l border-border/60 pl-2">
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Repositories
          </div>
          <Link to="/mc-repository" onClick={onNavigate} className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent" activeProps={{ className: "text-sidebar-primary font-semibold" }}>
            <UsersRound className="size-4" /><span>MC Repository</span>
          </Link>
          <Link to="/ec-repository" onClick={onNavigate} className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent" activeProps={{ className: "text-sidebar-primary font-semibold" }}>
            <Vote className="size-4" /><span>EC Repository</span>
          </Link>
          <Link to="/bye-law-repository" onClick={onNavigate} className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent" activeProps={{ className: "text-sidebar-primary font-semibold" }}>
            <BookOpenCheck className="size-4" /><span>Bye-Law Repository</span>
          </Link>
          <Link to="/mc-handbook" onClick={onNavigate} className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent" activeProps={{ className: "text-sidebar-primary font-semibold" }}>
            <BookOpen className="size-4" /><span>MC Handbook</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2 py-1">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
        <Building2 className="size-5" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold text-foreground">Indus Anantya Apartment</span>
        <span className="block text-xs text-muted-foreground">Facility Operations</span>
      </span>
    </div>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    const events = ["pointerdown", "keydown", "mousemove", "scroll", "touchstart"];
    const mark = () => {
      lastActivity.current = Date.now();
    };
    events.forEach((event) => window.addEventListener(event, mark, { passive: true }));
    const timer = window.setInterval(async () => {
      if (Date.now() - lastActivity.current >= 30 * 60 * 1000) {
        window.clearInterval(timer);
        await supabase.auth.signOut();
        router.navigate({ to: "/auth" });
      }
    }, 60 * 1000);
    return () => {
      window.clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, mark));
    };
  }, [router]);

  async function signOut() {
    if (!window.confirm("Are you sure you want to log out?")) return;
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar p-4 lg:flex">
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-1 scrollbar-thin">
          <Brand />
          <NavLinks />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center gap-2 border-b border-border bg-background/90 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:gap-3 sm:px-4 md:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="size-10 shrink-0 lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(86vw,20rem)] bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
                  <Brand />
                  <Button variant="ghost" size="icon" className="size-9" onClick={() => setOpen(false)} aria-label="Close navigation">
                    <X className="size-5" />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-8">
                  <NavLinks onNavigate={() => setOpen(false)} />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg md:text-xl">{title}</h1>
            {description ? <p className="hidden truncate text-xs text-muted-foreground sm:block md:text-sm">{description}</p> : null}
          </div>

          {actions ? <div className="order-3 w-full sm:order-none sm:w-auto">{actions}</div> : null}

          <Button
            variant="ghost"
            size="sm"
            className="size-10 shrink-0 gap-2 px-2 sm:h-9 sm:w-auto sm:px-3"
            onClick={signOut}
            aria-label="Sign out"
          >
            <LogOut className="size-[18px]" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </header>

        <main className={cn("mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-8")}>
          {children}
        </main>
      </div>
    </div>
  );
}
