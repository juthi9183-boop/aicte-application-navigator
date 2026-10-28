import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";

import { useApps, docCompletion, formatDate } from "@/lib/store";
import { AppStatus, STATUS_META } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel, PanelHeader, StatusBadge, EmptyState } from "@/components/status-badge";

export const Route = createFileRoute("/_protected/reports")({
  head: () => ({
    meta: [
      { title: "Reports — AICTE Smart Application Validation System" },
      {
        name: "description",
        content: "Status distribution, workload totals and a CSV export built from live application data.",
      },
      { property: "og:title", content: "Reports — AICTE Smart Application Validation System" },
      {
        property: "og:description",
        content: "Status distribution, workload totals and a CSV export built from live application data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
);

const STATUSES = Object.keys(STATUS_META) as AppStatus[];

function ReportsPage() {
  const apps = useApps();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const pending = apps.filter((a) => a.status === "submitted" || a.status === "verification").length;
  const corrections = apps.filter((a) => a.status === "corrections_required").length;

  const filtered = useMemo(() => {
    let list = status === "all" ? apps : apps.filter((a) => a.status === status);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((a) => a.id.toLowerCase().includes(q) || a.collegeName.toLowerCase().includes(q));
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [apps, status, query]);

  const maxCount = Math.max(1, ...STATUSES.map((s) => apps.filter((a) => a.status === s).length));

  function exportCsv() {
    const rows: string[][] = [
      ["Application ID", "College", "Status", "Submitted", "Documents %", "Decision date"],
      ...filtered.map((a) => [
        a.id,
        a.collegeName,
        STATUS_META[a.status].label,
        formatDate(a.submittedAt),
        String(docCompletion(a)),
        formatDate(a.decidedAt),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aicte-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported", { description: `${filtered.length} row(s) downloaded.` });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Live figures computed from the shared application data.</p>
        </div>
        <Button onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total applications", value: apps.length },
          { label: "Pending reviews", value: pending },
          { label: "Corrections requested", value: corrections },
          { label: "Final decisions taken", value: apps.filter((a) => a.status === "approved" || a.status === "rejected").length },
        ].map((s) => (
          <div key={s.label} className="border-2 border-foreground bg-card px-4 py-3 shadow-brutal-sm">
            <p className="text-3xl font-extrabold leading-none">{s.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <Panel>
        <PanelHeader title="Application status distribution" />
        <div className="space-y-2 px-4 py-4">
          {STATUSES.map((s) => {
            const count = apps.filter((a) => a.status === s).length;
            return (
              <div key={s} className="flex items-center gap-3">
                <span className="w-44 shrink-0 truncate text-xs font-bold uppercase tracking-wide">{STATUS_META[s].label}</span>
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="border-2 border-foreground bg-card pl-8"
            placeholder="Search by ID or college name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full border-2 border-foreground bg-card sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-2 border-foreground">
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nothing to report" description="No applications match the current filters." />
      ) : (
        <Panel>
          <PanelHeader title={`Application summary (${filtered.length})`} subtitle="Export respects the filters above" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-foreground text-left text-[11px] uppercase tracking-wide">
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">College</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Submitted</th>
                  <th className="px-4 py-2">Docs</th>
                  <th className="px-4 py-2">Decision</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-foreground/20 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-xs font-bold">{a.id}</td>
                    <td className="px-4 py-2 font-semibold">{a.collegeName}</td>
                    <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
                    <td className="whitespace-nowrap px-4 py-2">{formatDate(a.submittedAt)}</td>
                    <td className="px-4 py-2 font-semibold">{docCompletion(a)}%</td>
                    <td className="whitespace-nowrap px-4 py-2">{formatDate(a.decidedAt)}</td>
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
