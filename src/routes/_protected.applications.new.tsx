import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { useSession } from "@/lib/auth";
import { nextApplicationId, pushHistory, saveApplication } from "@/lib/store";
import { Application } from "@/lib/types";
import { ApplicationForm, FormIntent } from "@/components/application-form";

export const Route = createFileRoute("/_protected/applications/new")({
  head: () => ({
    meta: [
      { title: "New Application — AICTE Smart Application Validation System" },
      {
        name: "description",
        content: "Four-step form to create a college application with documents and submit it for validation.",
      },
      { property: "og:title", content: "New Application — AICTE Smart Application Validation System" },
      {
        property: "og:description",
        content: "Four-step form to create a college application with documents and submit it for validation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewApplicationPage,
});

function NewApplicationPage() {
  const navigate = useNavigate();
  const session = useSession();

  function handleSubmit(
    values: Omit<Application, "id" | "status" | "createdAt" | "updatedAt">,
    intent: FormIntent
  ) {
    const now = new Date().toISOString();
    const id = nextApplicationId();
    const app: Application = {
      ...values,
      id,
      status: intent === "draft" ? "draft" : "submitted",
      createdAt: now,
      updatedAt: now,
      submittedAt: intent === "draft" ? undefined : now,
      comments: [],
      history:
        intent === "draft"
          ? [{ status: "draft", at: now, by: session?.name ?? "Applicant" }]
          : pushHistory({ id, status: "draft", history: [] } as unknown as Application, "submitted", session?.name ?? "Applicant"),
    };
    saveApplication(app);
    if (intent === "draft") {
      toast.success("Draft saved", { description: `${id} — continue it any time from Applications.` });
      navigate({ to: "/applications" });
    } else {
      toast.success("Application submitted", { description: `Your application ID is ${id}.` });
      navigate({ to: "/applications/$id", params: { id }, search: { submitted: 1 } });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">New application</h1>
        <p className="text-sm text-muted-foreground">
          Complete all four steps. You can save a draft and return later.
        </p>
      </div>
      <ApplicationForm
        mode="create"
        onCancel={() => navigate({ to: "/applications" })}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
