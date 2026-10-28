import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Files, FilePlus2, BarChart3, LogOut, Menu, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Session, Role } from "@/lib/types";
import { roleLabel, signOut } from "@/lib/auth";
import { resetDemoData } from "@/lib/store";
import { Button } from "@/components/ui/button";

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["applicant", "officer", "admin"] },
  { to: "/applications", label: "Applications", icon: Files, roles: ["applicant", "officer", "admin"] },
  { to: "/applications/new", label: "New Application", icon: FilePlus2, roles: ["applicant"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["applicant", "officer", "admin"] },
];

function SidebarContent({
  session,
  onNavigate,
}: {
  session: Session;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b-2 border-foreground bg-primary px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/70">
          AICTE · SIH 2026 Demo
        </p>
        <p className="mt-1 text-lg font-extrabold leading-tight text-primary-foreground">
          Smart Application Validation System
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.filter((n) => n.roles.includes(session.role)).map((item) => {
          const active = item.to === "/applications/new"
            ? pathname.startsWith("/applications/new")
            : item.to === "/applications"
              ? pathname === "/applications" || (pathname.startsWith("/applications/") && pathname !== "/applications/new")
              : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 border-2 px-3 py-2 text-sm font-semibold transition-colors",
                active
                  ? "border-foreground bg-primary text-primary-foreground shadow-brutal-sm"
                  : "border-transparent hover:border-foreground hover:bg-secondary"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t-2 border-foreground px-3 py-4">
        {session.role === "admin" && (
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              resetDemoData();
              toast.success("Demo data reset", { description: "All applications restored to the seeded state." });
              navigate({ to: "/dashboard" });
              onNavigate?.();
            }}
          >
            <RotateCcw className="size-4" />
            Reset demo data
          </Button>
        )}
        <div className="rounded-none border-2 border-foreground bg-secondary px-3 py-2 text-xs">
          <p className="font-bold uppercase tracking-wide">{session.name}</p>
          <p className="text-muted-foreground">{roleLabel(session.role)}</p>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => {
            signOut();
            navigate({ to: "/" });
          }}
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ session, children }: { session: Session; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r-2 border-foreground bg-card lg:block">
        <SidebarContent session={session} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r-2 border-foreground bg-card">
            <SidebarContent session={session} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b-2 border-foreground bg-card px-4">
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <p className="hidden text-sm font-bold uppercase tracking-wide md:block">
            Application Validation Workspace
          </p>
          <span className="ml-auto inline-flex items-center gap-1.5 border-2 border-foreground bg-secondary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
            <ShieldCheck className="size-3.5" />
            Simulated demo
          </span>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
