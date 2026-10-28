import { Link, createFileRoute } from "@tanstack/react-router";
import { FilePlus2, ArrowRight } from "lucide-react";

import { useApps, docCompletion, formatDate } from "@/lib/store";
import { useSession } from "@/lib/auth";
import { AppStatus, STATUS_META } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader, StatusBadge, EmptyState } from "@/components/status-badge";

export const Route = createFileRoute("/_protected/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AICTE Smart Application Validation System" },
      {
        name: "description",
        content: "Live overview of application volumes, verification queue and decisions in the validation demo.",
      },
      { property: "og:title", content: "Dashboard — AICTE Smart Application Validation System" },
      {
        property: "og:description",
        content: "Live overview of application volumes, verification queue and decisions in the validation demo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
);

const STATUS_ORDER: AppStatus[] = [
  "draft",
  "submitted",
  "verification",
  "officer_review",
  "corrections_required",
  "approved",
  "rejected",
];

function StatCard({ label, value, to }: { label: string; value: number; to?: string }) {
  const body = (
    <div className="border-2 border-foreground bg-card px-4 py-3 shadow-brutal-sm">
      <p className="text-3xl font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function DashboardPage() {
  const apps = useApps();
  const session = useSession();
  const isApplicant = session?.role === "applicant";

  const total = apps.length;
  const pending = apps.filter((a) => a.status === "submitted" || a.status === "verification").length;
  const attention = apps.filter((a) => a.status === "corrections_required").length;
  const approved = apps.filter((a) => a.status === "approved").length;
  const rejected = apps.filter((a) => a.status === "rejected").length;

  const recent = [...apps].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const maxCount = Math.max(1, ...STATUS_ORDER.map((s) => apps.filter((a) => a.status === s).length));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome, {session?.name}. All figures update live from the shared demo data.
          </p>
        </div>
        {isApplicant && (
          <Button asChild>
            <Link to="/applications/new">
              <FilePlus2 className="size-4" /> New Application
            </Link>
          </Button>
        )}
        {!isApplicant && (
          <Button asChild variant="outline">
            <Link to="/applications">
              Open verification queue <ArrowRight className="size-4" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Total applications" value={total} to="/applications" />
        <StatCard label="Pending verification" value={pending} to="/applications" />
        <StatCard label="Needs attention" value={attention} to="/applications" />
        <StatCard label="Approved" value={approved} to="/reports" />
        <StatCard label="Rejected" value={rejected} to="/reports" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Application status distribution" subtitle="Counts by current stage" />
          <div className="space-y-2 px-4 py-4">
            {STATUS_ORDER.map((s) => {
              const count = apps.filter((a) => a.status === s).length;
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-xs font-bold uppercase tracking-wide">
                    {STATUS_META[s].label}
                  </span>
                  <div className="h-5 flex-1 border-2 border-foreground bg-secondary">
                    <div
                      className={`h-full ${STATUS_META[s].className} border-r-2 border-foreground`}
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-extrabold">{count}</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Recent applications" subtitle="Six most recently updated records" />
          {recent.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No applications yet"
                description="Create the first application to populate the dashboard."
                action={
                  isApplicant ? (
                    <Button asChild size="sm">
                      <Link to="/applications/new">New Application</Link>
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-foreground text-left text-[11px] uppercase tracking-wide">
                    <th className="px-4 py-2">Application</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Docs</th>
                    <th className="px-4 py-2">Updated</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {recent.map((a) => (
                    <tr key={a.id} className="border-b border-foreground/20 last:border-0">
                      <td className="px-4 py-2">
                        <p className="font-semibold">{a.collegeName}</p>
                        <p className="text-xs text-muted-foreground">{a.id}</p>
                      </td>
                      <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-2 font-semibold">{docCompletion(a)}%</td>
                      <td className="px-4 py-2 whitespace-nowrap">{formatDate(a.updatedAt)}</td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          to="/applications/$id"
                          params={{ id: a.id }}
                          className="text-xs font-bold underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
