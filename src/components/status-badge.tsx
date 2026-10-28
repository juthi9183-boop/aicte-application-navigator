import { cn } from "@/lib/utils";
import { STATUS_META, AppStatus } from "@/lib/types";

export function StatusBadge({ status, className }: { status: AppStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap border-2 border-foreground px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        meta.className,
        className
      )}
    >
      {meta.label}
    </span>
  );
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("border-2 border-foreground bg-card shadow-brutal-sm", className)}>{children}</div>
  );
}

export function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b-2 border-foreground bg-secondary px-4 py-3">
      <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
      {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-foreground/40 bg-card px-6 py-12 text-center">
      <p className="font-bold uppercase tracking-wide">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
