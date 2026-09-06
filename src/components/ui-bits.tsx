import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-destructive/10 text-destructive",
  }[tone];

  return (
    <Card className="rise overflow-hidden">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", toneClass)}>
            <Icon className="size-5" />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

const STATUS_TONES: Record<string, string> = {
  active: "bg-success/12 text-success border-success/25",
  present: "bg-success/12 text-success border-success/25",
  occupied: "bg-success/12 text-success border-success/25",
  paid: "bg-success/12 text-success border-success/25",
  inside: "bg-success/12 text-success border-success/25",
  resolved: "bg-success/12 text-success border-success/25",
  closed: "bg-muted text-muted-foreground border-border",
  exited: "bg-muted text-muted-foreground border-border",
  inactive: "bg-muted text-muted-foreground border-border",
  vacant: "bg-warning/15 text-warning border-warning/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  leave: "bg-warning/15 text-warning border-warning/30",
  open: "bg-primary/10 text-primary border-primary/25",
  absent: "bg-destructive/10 text-destructive border-destructive/25",
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const key = (value ?? "").toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        STATUS_TONES[key] ?? "bg-secondary text-secondary-foreground border-border",
      )}
    >
      {value ?? "—"}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("rise", className)}>
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions}
        </div>
      ) : null}
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}
