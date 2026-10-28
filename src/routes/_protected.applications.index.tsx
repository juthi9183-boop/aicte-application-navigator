import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { useApps, docCompletion, formatDate } from "@/lib/store";
import { useSession } from "@/lib/auth";
import { AppStatus, STATUS_META } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel, PanelHeader, StatusBadge, EmptyState } from "@/components/status-badge";

export const Route = createFileRoute("/_protected/applications/")({
  head: () => ({
    meta: [
      { title: "Applications — AICTE Smart Application Validation System" },
      {
        name: "description",
        content: "Search, filter and open every application in the validation demo workspace.",
      },
      { property: "og:title", content: "Applications — AICTE Smart Application Validation System" },
      {
        property: "og:description",
        content: "Search, filter and open every application in the validation demo workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApplicationsPage,
);

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  ...(Object.keys(STATUS_META) as AppStatus[]).map((s) => ({ value: s, label: STATUS_META[s].label })),
];

function ApplicationsPage() {
  const apps = useApps();
  const session = useSession();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const isApplicant = session?.role === "applicant";
  const visible = useMemo(() => {
    let list = isApplicant ? apps.filter((a) => a.ownerEmail === session?.email) : apps;
    if (status !== "all") list = list.filter((a) => a.status === status);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) => a.id.toLowerCase().includes(q) || a.collegeName.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [apps, isApplicant, session?.email, status, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Applications</h1>
        <p className="text-sm text-muted-foreground">
          {isApplicant
            ? "Your submitted applications and drafts."
            : "Every application in the validation queue."}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="border-2 border-foreground bg-card pl-8"
            placeholder="Search by application ID or college name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full border-2 border-foreground bg-card sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-2 border-foreground">
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No applications match"
          description="Try a different search term or status filter, or clear the filters."
          action={
            <Button variant="outline" size="sm" onClick={() => { setQuery(""); setStatus("all"); }}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <Panel>
          <PanelHeader title={`${visible.length} application${visible.length === 1 ? "" : "s"}`} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-foreground text-left text-[11px] uppercase tracking-wide">
                  <th className="px-4 py-2">Application ID</th>
                  <th className="px-4 py-2">College</th>
                  <th className="px-4 py-2">Submitted</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Documents</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id} className="border-b border-foreground/20 last:border-0 hover:bg-secondary/50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold">{a.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{a.collegeName}</p>
                      <p className="text-xs text-muted-foreground">{a.city}, {a.state}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(a.submittedAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-20 border-2 border-foreground bg-secondary">
                          <div className="h-full bg-status-review border-r-2 border-foreground" style={{ width: `${docCompletion(a)}%` }} />
                        </div>
                        <span className="font-semibold">{docCompletion(a)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/applications/$id" params={{ id: a.id }}>
                          {a.status === "draft" && isApplicant ? "Continue draft" : "View details"}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
