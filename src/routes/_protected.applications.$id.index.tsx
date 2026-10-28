import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CircleCheck,
  CircleAlert,
  CircleX,
  PlayCircle,
  ClipboardEdit,
  ArrowRight,
} from "lucide-react";

import { useSession, roleCanReview } from "@/lib/auth";
import {
  addComment,
  canOfficerApprove,
  docCompletion,
  formatDate,
  formatDateTime,
  missingDocTypes,
  patchApplication,
  pushHistory,
  runAnalysis,
  useApps,
} from "@/lib/store";
import {
  AnalysisResult,
  AppDoc,
  Application,
  DocStatus,
  REQUIRED_DOCS,
  STATUS_META,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Panel, PanelHeader, StatusBadge, EmptyState } from "@/components/status-badge";
import { DocPreviewDialog } from "@/components/doc-preview";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_protected/applications/$id/")({
  validateSearch: (search: Record<string, unknown>) => ({
    submitted: search.submitted === "1" || search.submitted === 1,
  }),
  head: () => ({
    meta: [
      { title: "Application details — AICTE Smart Application Validation System" },
      {
        name: "description",
        content: "Documents, simulated verification analysis, officer review and status tracking for one application.",
      },
      { property: "og:title", content: "Application details — AICTE Smart Application Validation System" },
      {
        property: "og:description",
        content: "Documents, simulated verification analysis, officer review and status tracking for one application.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApplicationDetailPage,
});

function DocChip({ status }: { status: DocStatus }) {
  const map: Record<DocStatus, { label: string; cls: string }> = {
    pass: { label: "Pass", cls: "bg-status-approved/30" },
    warning: { label: "Warning", cls: "bg-status-corrections/40" },
    fail: { label: "Fail", cls: "bg-status-rejected/30" },
    not_checked: { label: "Not checked", cls: "bg-secondary" },
  };
  return (
    <span className={cn("inline-block border-2 border-foreground px-2 py-0.5 text-[11px] font-bold uppercase", map[status].cls)}>
      {map[status].label}
    </span>
  );
}

function OverallBanner({ overall }: { overall: DocStatus }) {
  const cfg = {
    pass: { icon: CircleCheck, text: "Analysis passed — no blocking findings.", cls: "bg-status-approved/25" },
    warning: { icon: CircleAlert, text: "Analysis found warnings that need officer attention.", cls: "bg-status-corrections/35" },
    fail: { icon: CircleX, text: "Analysis found blocking errors — approval is not possible.", cls: "bg-status-rejected/30" },
    not_checked: { icon: CircleAlert, text: "Analysis has not been run yet.", cls: "bg-secondary" },
  }[overall];
  const Icon = cfg.icon;
  return (
    <div className={cn("flex items-start gap-3 border-2 border-foreground px-4 py-3", cfg.cls)}>
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="text-sm font-bold uppercase tracking-wide">Simulated analysis: {overall}</p>
        <p className="text-sm">{cfg.text}</p>
      </div>
    </div>
  );
}

function ApplicationDetailPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const apps = useApps();
  const session = useSession();
  const app = apps.find((a) => a.id === id);

  const [tab, setTab] = useState("overview");
  const [previewDoc, setPreviewDoc] = useState<AppDoc | null>(null);
  const [dialog, setDialog] = useState<"corrections" | "reject" | "approve" | null>(null);
  const [dialogText, setDialogText] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  if (!session) return null;
  if (!app) {
    return (
      <EmptyState
        title="Application not found"
        description={`No application with ID ${id} exists in this browser's demo data.`}
        action={
          <Button asChild size="sm">
            <Link to="/applications">Back to applications</Link>
          </Button>
        }
      />
    );
  }

  const isReviewer = roleCanReview(session.role);
  const isOwner = session.role === "applicant" && app.ownerEmail === session.email;
  const missing = missingDocTypes(app);
  const gate = canOfficerApprove(app);
  const lastEvent = app.history[app.history.length - 1];

  function startAnalysis() {
    setAnalyzing(true);
    // Simulated processing delay so the demo feels like a real scan.
    window.setTimeout(() => {
      const result: AnalysisResult = runAnalysis(app);
      patchApplication(app.id, { analysis: result });
      setAnalyzing(false);
      toast.success("Simulated analysis complete", {
        description: `Overall result: ${result.overall}. Results are simulated demo output.`,
      });
    }, 1100);
  }

  function submitDialog() {
    if (!app) return;
    const text = dialogText.trim();
    if (dialog !== "approve" && text.length < 10) {
      setDialogError("Please write at least 10 characters so the applicant knows what to fix.");
      return;
    }
    setDialogError(null);
    if (dialog === "corrections") {
      patchApplication(app.id, {
        status: "corrections_required",
        comments: addComment(app, session.name, session.role, text),
        history: pushHistory(app, "corrections_required", session.name, text),
      });
      toast.success("Corrections requested", { description: `${app.id} sent back to the applicant.` });
    } else if (dialog === "reject") {
      patchApplication(app.id, {
        status: "rejected",
        decidedAt: new Date().toISOString(),
        comments: addComment(app, session.name, session.role, text),
        history: pushHistory(app, "rejected", session.name, text),
      });
      toast.success("Application rejected", { description: `${app.id} marked as rejected.` });
    } else if (dialog === "approve") {
      patchApplication(app.id, {
        status: "approved",
        decidedAt: new Date().toISOString(),
        history: pushHistory(app, "approved", session.name, dialogText.trim() || undefined),
      });
      toast.success("Application approved", { description: `${app.id} approved.` });
    }
    setDialog(null);
    setDialogText("");
  }

  const approveBlocked = !gate.ok || app.status !== "officer_review";

  return (
    <div className="space-y-6">
      {search.submitted && app.status === "submitted" && (
        <div className="border-2 border-foreground bg-status-approved/25 px-4 py-4 shadow-brutal-sm">
          <p className="text-xs font-bold uppercase tracking-wide">Submission confirmed</p>
          <p className="mt-1 text-lg font-extrabold">Application ID: {app.id}</p>
          <p className="text-sm text-muted-foreground">
            Save this ID to track progress. The application is now in the verification queue.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold text-muted-foreground">{app.id}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">{app.collegeName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={app.status} />
            <span className="border-2 border-foreground bg-card px-2 py-0.5 text-[11px] font-bold uppercase">
              Documents {docCompletion(app)}%
            </span>
            {app.analysis && (
              <span className="border-2 border-foreground bg-card px-2 py-0.5 text-[11px] font-bold uppercase">
                Analysis: {app.analysis.overall}
              </span>
            )}
          </div>
        </div>
        {isOwner && app.status === "draft" && (
          <Button asChild>
            <Link to="/applications/$id/edit" params={{ id: app.id }}>
              <ClipboardEdit className="size-4" /> Continue draft
            </Link>
          </Button>
        )}
        {isOwner && app.status === "corrections_required" && (
          <Button asChild>
            <Link to="/applications/$id/edit" params={{ id: app.id }}>
              <ClipboardEdit className="size-4" /> Edit &amp; resubmit
            </Link>
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-none border-2 border-foreground bg-secondary p-1">
          <TabsTrigger value="overview" className="border-0 data-[state=active]:bg-card data-[state=active]:shadow-none rounded-none font-bold uppercase text-xs">Overview</TabsTrigger>
          <TabsTrigger value="tracking" className="border-0 data-[state=active]:bg-card data-[state=active]:shadow-none rounded-none font-bold uppercase text-xs">Tracking</TabsTrigger>
          <TabsTrigger value="documents" className="border-0 data-[state=active]:bg-card data-[state=active]:shadow-none rounded-none font-bold uppercase text-xs">Documents</TabsTrigger>
          <TabsTrigger value="verification" className="border-0 data-[state=active]:bg-card data-[state=active]:shadow-none rounded-none font-bold uppercase text-xs">Verification</TabsTrigger>
          {isReviewer && (
            <TabsTrigger value="review" className="border-0 data-[state=active]:bg-card data-[state=active]:shadow-none rounded-none font-bold uppercase text-xs">Officer Review</TabsTrigger>
          )}
        </TabsList>

        {/* ---------------- Overview ---------------- */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Application summary" />
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-4 text-sm">
                <dt className="text-muted-foreground">Application ID</dt><dd className="font-mono font-semibold">{app.id}</dd>
                <dt className="text-muted-foreground">Institution type</dt><dd className="font-semibold">{app.institutionType}</dd>
                <dt className="text-muted-foreground">Application type</dt><dd className="font-semibold">{app.applicationType}</dd>
                <dt className="text-muted-foreground">Academic year</dt><dd className="font-semibold">{app.academicYear}</dd>
                <dt className="text-muted-foreground">Established</dt><dd className="font-semibold">{app.establishedYear}</dd>
                <dt className="text-muted-foreground">Address</dt><dd className="font-semibold">{app.address}, {app.city}, {app.state} — {app.pincode}</dd>
                <dt className="text-muted-foreground">Contact person</dt><dd className="font-semibold">{app.contactPerson}</dd>
                <dt className="text-muted-foreground">Contact email</dt><dd className="font-semibold">{app.contactEmail}</dd>
                <dt className="text-muted-foreground">Contact phone</dt><dd className="font-semibold">{app.contactPhone || "— missing —"}</dd>
                <dt className="text-muted-foreground">Submitted on</dt><dd className="font-semibold">{formatDateTime(app.submittedAt)}</dd>
              </dl>
            </Panel>
            <div className="space-y-4">
              <Panel>
                <PanelHeader title="Courses applied" />
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-foreground text-left text-[11px] uppercase tracking-wide">
                      <th className="px-4 py-2">Course</th><th className="px-4 py-2">Level</th><th className="px-4 py-2">Intake</th><th className="px-4 py-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {app.courses.map((c, i) => (
                      <tr key={i} className="border-b border-foreground/20 last:border-0">
                        <td className="px-4 py-2 font-semibold">{c.name}</td>
                        <td className="px-4 py-2">{c.level}</td>
                        <td className="px-4 py-2">{c.intake}</td>
                        <td className="px-4 py-2">{c.durationYears} yr</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
              {isOwner && (
                <Panel>
                  <PanelHeader title="Your next step" />
                  <div className="px-4 py-4 text-sm">
                    {app.status === "draft" && (
                      <p>Draft in progress. <Link className="font-bold underline" to="/applications/$id/edit" params={{ id: app.id }}>Continue the draft</Link> to complete and submit.</p>
                    )}
                    {app.status === "submitted" && <p>Your application is queued for document verification.</p>}
                    {app.status === "verification" && <p>Documents are being verified. Check the Tracking tab for updates.</p>}
                    {app.status === "officer_review" && <p>The verification officer is reviewing this application.</p>}
                    {app.status === "corrections_required" && (
                      <p className="font-semibold">The officer requested corrections. <Link className="underline" to="/applications/$id/edit" params={{ id: app.id }}>Edit the application and resubmit</Link> — see the Tracking tab for the officer's comments.</p>
                    )}
                    {app.status === "approved" && <p>Approved on {formatDate(app.decidedAt)}. Congratulations.</p>}
                    {app.status === "rejected" && <p>Rejected on {formatDate(app.decidedAt)}. See the officer's comments under Tracking.</p>}
                  </div>
                </Panel>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ---------------- Tracking ---------------- */}
        <TabsContent value="tracking" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Status timeline" subtitle="Draft → Submitted → Verification → Officer Review → Decision" />
              <ol className="space-y-0 px-4 py-4">
                {app.history.length === 0 && (
                  <li className="text-sm text-muted-foreground">No history yet — this application is still a draft.</li>
                )}
                {[...app.history].reverse().map((e, i, arr) => (
                  <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < arr.length - 1 && <span className="absolute left-[7px] top-4 h-full w-0.5 bg-foreground" />}
                    <span className="relative mt-1 size-4 shrink-0 rounded-full border-2 border-foreground bg-status-submitted" />
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wide">{STATUS_META[e.status].label}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(e.at)} · by {e.by}</p>
                      {e.note && <p className="mt-1 border-l-2 border-foreground pl-2 text-sm">{e.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
            <Panel>
              <PanelHeader title="Officer comments" subtitle="Visible to the applicant" />
              <div className="space-y-3 px-4 py-4">
                {app.comments.length === 0 && (
                  <p className="text-sm text-muted-foreground">No officer comments yet.</p>
                )}
                {[...app.comments].reverse().map((c) => (
                  <div key={c.id} className="border-2 border-foreground/30 bg-secondary/60 px-3 py-2">
                    <p className="text-xs font-bold uppercase tracking-wide">{c.author} · {c.role}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(c.at)}</p>
                    <p className="mt-1 text-sm">{c.text}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </TabsContent>

        {/* ---------------- Documents ---------------- */}
        <TabsContent value="documents" className="mt-4">
          <Panel>
            <PanelHeader
              title="Document checklist"
              subtitle={`${REQUIRED_DOCS.length - missing.length} of ${REQUIRED_DOCS.length} required documents uploaded`}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-foreground text-left text-[11px] uppercase tracking-wide">
                    <th className="px-4 py-2">Document</th>
                    <th className="px-4 py-2">File</th>
                    <th className="px-4 py-2">Analysis result</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {REQUIRED_DOCS.map((req) => {
                    const doc = app.documents.find((d) => d.type === req.type);
                    const aiStatus = app.analysis?.docStatuses[req.type]?.status ?? "not_checked";
                    return (
                      <tr key={req.type} className="border-b border-foreground/20 last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-semibold">{req.label}</p>
                          <p className="text-xs text-muted-foreground">{req.hint}</p>
                        </td>
                        <td className="px-4 py-3">
                          {doc ? (
                            <>
                              <p className="max-w-56 truncate font-medium">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">{doc.sizeKb} KB · {formatDate(doc.uploadedAt)}</p>
                            </>
                          ) : (
                            <span className="font-bold text-destructive">Not uploaded</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <DocChip status={doc ? aiStatus : "fail"} />
                          {app.analysis?.docStatuses[req.type]?.note && (
                            <p className="mt-1 text-xs text-muted-foreground">{app.analysis.docStatuses[req.type].note}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {doc && (
                            <Button size="sm" variant="outline" onClick={() => setPreviewDoc(doc)}>
                              Preview
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
          <p className="mt-3 text-xs text-muted-foreground">
            Previews open in a dialog. Seeded sample documents have no real file attached; documents uploaded in this
            demo session can be previewed as PDF or image.
          </p>
        </TabsContent>

        {/* ---------------- Verification ---------------- */}
        <TabsContent value="verification" className="mt-4">
          <div className="space-y-4">
            {isReviewer && app.status === "submitted" && (
              <Panel>
                <PanelHeader title="Queue action" />
                <div className="flex flex-wrap items-center gap-3 px-4 py-4">
                  <Button
                    onClick={() => {
                      patchApplication(app.id, {
                        status: "verification",
                        history: pushHistory(app, "verification", session.name),
                      });
                      toast.success("Document verification started");
                    }}
                  >
                    Begin document verification <ArrowRight className="size-4" />
                  </Button>
                  <p className="text-sm text-muted-foreground">Moves this application from Submitted to Document Verification.</p>
                </div>
              </Panel>
            )}

            {isReviewer && app.status === "verification" && (
              <Panel>
                <PanelHeader title="Queue action" />
                <div className="flex flex-wrap items-center gap-3 px-4 py-4">
                  <Button
                    disabled={!app.analysis}
                    onClick={() => {
                      patchApplication(app.id, {
                        status: "officer_review",
                        history: pushHistory(app, "officer_review", session.name),
                      });
                      toast.success("Moved to officer review");
                    }}
                  >
                    Move to officer review <ArrowRight className="size-4" />
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    {app.analysis ? "Analysis results are ready for the officer." : "Run the simulated analysis first."}
                  </p>
                </div>
              </Panel>
            )}

            <Panel>
              <PanelHeader title="Simulated AI analysis" subtitle="Deterministic demo output based on this application's data — not real document authentication" />
              <div className="px-4 py-4">
                {isReviewer ? (
                  <Button onClick={startAnalysis} disabled={analyzing}>
                    <PlayCircle className="size-4" />
                    {analyzing ? "Analyzing documents…" : app.analysis ? "Re-run simulated analysis" : "Run simulated AI analysis"}
                  </Button>
                ) : !app.analysis ? (
                  <p className="text-sm text-muted-foreground">The verification officer has not run the analysis yet.</p>
                ) : null}

                {analyzing && (
                  <p className="mt-3 animate-pulse text-sm font-semibold">
                    Scanning uploaded documents and extracted fields…
                  </p>
                )}

                {app.analysis && !analyzing && (
                  <div className="mt-4 space-y-4">
                    <OverallBanner overall={app.analysis.overall} />
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide">Findings ({app.analysis.findings.length})</p>
                      {app.analysis.findings.length === 0 ? (
                        <p className="text-sm">No findings. All extracted values matched the application record.</p>
                      ) : (
                        <ul className="space-y-2">
                          {app.analysis.findings.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 border-2 border-foreground/30 bg-secondary/60 px-3 py-2 text-sm">
                              {f.severity === "error" ? (
                                <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" />
                              ) : (
                                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                              )}
                              <span>{f.message}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Analysis run {formatDateTime(app.analysis.runAt)} · Simulated result for demonstration only.
                      {missing.length > 0 && ` ${missing.length} required document(s) missing.`}
                    </p>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </TabsContent>

        {/* ---------------- Officer review ---------------- */}
        {isReviewer && (
          <TabsContent value="review" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <Panel>
                  <PanelHeader title="Review checklist" />
                  <ul className="space-y-2 px-4 py-4 text-sm">
                    <li className="flex items-center gap-2">
                      {app.analysis ? <CircleCheck className="size-4 shrink-0" /> : <CircleAlert className="size-4 shrink-0" />}
                      Simulated analysis {app.analysis ? `run — overall ${app.analysis.overall}` : "not run yet"}
                    </li>
                    <li className="flex items-center gap-2">
                      {missing.length === 0 ? <CircleCheck className="size-4 shrink-0" /> : <CircleX className="size-4 shrink-0 text-destructive" />}
                      {missing.length === 0 ? "All required documents uploaded" : `${missing.length} required document(s) missing`}
                    </li>
                    <li className="flex items-center gap-2">
                      {app.status === "officer_review" ? <CircleCheck className="size-4 shrink-0" /> : <CircleAlert className="size-4 shrink-0" />}
                      Application is in Officer Review stage (currently {STATUS_META[app.status].label})
                    </li>
                  </ul>
                  {app.analysis && app.analysis.findings.length > 0 && (
                    <div className="border-t-2 border-foreground px-4 py-3">
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide">Compliance findings</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm">
                        {app.analysis.findings.map((f, i) => (
                          <li key={i}>{f.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Panel>

                <Panel>
                  <PanelHeader title="Reviewer notes" />
                  <div className="space-y-3 px-4 py-4">
                    <div className="space-y-2">
                      {app.comments.length === 0 && <p className="text-sm text-muted-foreground">No notes recorded yet.</p>}
                      {[...app.comments].reverse().map((c) => (
                        <div key={c.id} className="border-2 border-foreground/30 bg-secondary/60 px-3 py-2">
                          <p className="text-xs font-bold uppercase tracking-wide">{c.author} · {formatDateTime(c.at)}</p>
                          <p className="mt-1 text-sm">{c.text}</p>
                        </div>
                      ))}
                    </div>
                    <Textarea
                      placeholder="Add an internal note for the record…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={note.trim().length < 3}
                      onClick={() => {
                        patchApplication(app.id, { comments: addComment(app, session.name, session.role, note.trim()) });
                        setNote("");
                        toast.success("Note added to the record");
                      }}
                    >
                      Add note
                    </Button>
                  </div>
                </Panel>
              </div>

              <Panel>
                <PanelHeader title="Final decision" subtitle="Confirmations are required for every final action" />
                <div className="space-y-3 px-4 py-4">
                  <Button className="w-full" variant="outline" onClick={() => { setDialog("corrections"); setDialogText(""); setDialogError(null); }}>
                    Request corrections
                  </Button>
                  <Button className="w-full" variant="destructive" onClick={() => { setDialog("reject"); setDialogText(""); setDialogError(null); }}>
                    Reject application
                  </Button>
                  <Button className="w-full" disabled={approveBlocked} onClick={() => { setDialog("approve"); setDialogText(""); setDialogError(null); }}>
                    Approve application
                  </Button>
                  {approveBlocked && (
                    <ul className="list-disc pl-5 text-xs text-muted-foreground">
                      {(app.status !== "officer_review" ? [`Application must be in Officer Review (currently ${STATUS_META[app.status].label}).`, ...gate.reasons] : gate.reasons).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Last status change: {lastEvent ? `${STATUS_META[lastEvent.status].label} · ${formatDateTime(lastEvent.at)} · by ${lastEvent.by}` : "none"}
                  </p>
                </div>
              </Panel>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <DocPreviewDialog doc={previewDoc} open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)} />

      {/* Decision dialogs */}
      <AlertDialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent className="border-2 border-foreground bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase tracking-wide">
              {dialog === "corrections" && "Request corrections"}
              {dialog === "reject" && "Reject this application?"}
              {dialog === "approve" && "Approve this application?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog === "corrections" && "The application returns to the applicant with your comment. They can edit and resubmit it."}
              {dialog === "reject" && "This is a final decision. The applicant will see your reason in their tracking page."}
              {dialog === "approve" && "This is a final decision. The application will be marked approved across dashboard, tracking and reports."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {dialog !== "approve" && (
            <div className="space-y-1">
              <Textarea
                rows={4}
                placeholder={dialog === "corrections" ? "Describe exactly what must be corrected…" : "State the reason for rejection…"}
                value={dialogText}
                onChange={(e) => setDialogText(e.target.value)}
              />
              {dialogError && <p className="text-xs font-semibold text-destructive">{dialogError}</p>}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn("border-2 border-foreground", dialog === "approve" && "bg-primary text-primary-foreground")}
              onClick={(e) => {
                e.preventDefault();
                submitDialog();
              }}
            >
              Confirm {dialog === "corrections" ? "request" : dialog}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
