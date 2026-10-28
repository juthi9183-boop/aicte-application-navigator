import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { useApps, useSession } from "@/lib/auth";
import { formatDateTime, pushHistory, saveApplication } from "@/lib/store";
import { Application } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ApplicationForm, FormIntent } from "@/components/application-form";
import { EmptyState } from "@/components/status-badge";

export const Route = createFileRoute("/_protected/applications/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit application — AICTE Smart Application Validation System" },
      {
        name: "description",
        content: "Edit a draft or correct an application and resubmit it to the verification queue.",
      },
      { property: "og:title", content: "Edit application — AICTE Smart Application Validation System" },
      {
        property: "og:description",
        content: "Edit a draft or correct an application and resubmit it to the verification queue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditApplicationPage,
});

function EditApplicationPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const apps = useApps();
  const session = useSession();
  const app = apps.find((a) => a.id === id);

  if (!session) return null;
  if (!app || app.ownerEmail !== session.email || (app.status !== "draft" && app.status !== "corrections_required")) {
    return (
      <EmptyState
        title="This application cannot be edited"
        description="Only your own drafts and applications with corrections requested can be edited."
        action={
          <Button asChild size="sm">
            <Link to="/applications">Back to applications</Link>
          </Button>
        }
      />
    );
  }

  const corrections = app.status === "corrections_required";

  function handleSubmit(
    values: Omit<Application, "id" | "status" | "createdAt" | "updatedAt">,
    intent: FormIntent
  ) {
    const now = new Date().toISOString();
    const updated: Application = {
      ...app,
      ...values,
      documents: values.documents,
      comments: app.comments,
      history: app.history,
      updatedAt: now,
    };
    if (intent === "draft") {
      saveApplication({ ...updated, status: "draft" });
      toast.success("Draft saved", { description: `${app.id} — you can continue later.` });
      navigate({ to: "/applications" });
      return;
    }
    const withHistory = {
      ...updated,
      status: "submitted" as const,
      submittedAt: now,
      analysis: undefined, // stale results are cleared; the officer re-runs analysis
      history: pushHistory(
        { ...updated, history: app.history },
        "submitted",
        session.name,
        corrections ? "Resubmitted after corrections." : undefined
      ),
    };
    saveApplication(withHistory);
    toast.success(corrections ? "Application resubmitted" : "Application submitted", {
      description: `${app.id} is back in the verification queue.`,
    });
    navigate({ to: "/applications/$id", params: { id: app.id }, search: { submitted: 1 } });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-bold text-muted-foreground">{app.id}</p>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {corrections ? "Correct & resubmit application" : "Continue draft"}
        </h1>
        {corrections && (
          <div className="mt-2 border-2 border-foreground bg-status-corrections/35 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide">Officer feedback</p>
            {[...app.comments].reverse().slice(0, 2).map((c) => (
              <p key={c.id} className="mt-1 text-sm">
                {c.author} · {formatDateTime(c.at)} — {c.text}
              </p>
            ))}
          </div>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          Update the details and documents below. Resubmitting returns the application to the officer's queue; previous
          review history is preserved.
        </p>
      </div>
      <ApplicationForm
        mode="edit"
        initial={app}
        onCancel={() => navigate({ to: "/applications/$id", params: { id: app.id } })}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
