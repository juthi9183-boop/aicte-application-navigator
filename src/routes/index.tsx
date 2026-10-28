import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { getSession, signIn, DEMO_USERS, roleLabel } from "@/lib/auth";
import { Role, ROLE_META } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && getSession()) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — AICTE Smart Application Validation System" },
      {
        name: "description",
        content: "Simulated demo sign-in for the AICTE Smart Application Validation System prototype.",
      },
      { property: "og:title", content: "Sign in — AICTE Smart Application Validation System" },
      {
        property: "og:description",
        content: "Simulated demo sign-in for the AICTE Smart Application Validation System prototype.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const ROLE_ORDER: Role[] = ["applicant", "officer", "admin"];

function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("applicant");
  const [email, setEmail] = useState(DEMO_USERS.applicant.email);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);

  function doLogin(r: Role, mail: string, pass: string) {
    const parsed = credentialsSchema.safeParse({ email: mail, password: pass });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({ email: flat.email?.[0], password: flat.password?.[0] });
      return;
    }
    setErrors({});
    setBusy(true);
    // Simulated authentication: no real accounts exist in this demo.
    window.setTimeout(() => {
      signIn({ role: r, name: DEMO_USERS[r].name, email: parsed.data.email });
      toast.success(`Signed in as ${roleLabel(r)}`, {
        description: "Demo authentication — sign-in state is stored locally.",
      });
      navigate({ to: "/dashboard" });
      setBusy(false);
    }, 450);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-4xl">
        <div className="mb-6 border-2 border-foreground bg-primary px-6 py-5 text-primary-foreground shadow-brutal">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary-foreground/70">
            AICTE · Smart India Hackathon 2026
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
            Smart Application Validation System
          </h1>
          <p className="mt-1 text-sm text-primary-foreground/80">
            College application submission, document verification and officer decision — demonstration prototype.
          </p>
        </div>

        <p className="mb-4 border-2 border-dashed border-foreground/50 bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-wide">
          Demo authentication — accounts are simulated, no real credentials are used
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-bold uppercase tracking-wide">Choose a demo role</p>
            {ROLE_ORDER.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(r);
                  setEmail(DEMO_USERS[r].email);
                  setPassword("");
                  setErrors({});
                }}
                className={cn(
                  "block w-full border-2 border-foreground bg-card px-4 py-3 text-left shadow-brutal-sm transition-transform",
                  role === r && "bg-secondary shadow-brutal"
                )}
              >
                <p className="text-sm font-extrabold uppercase tracking-wide">{ROLE_META[r].label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{ROLE_META[r].description}</p>
              </button>
            ))}
          </div>

          <form
            className="border-2 border-foreground bg-card p-6 shadow-brutal"
            onSubmit={(e) => {
              e.preventDefault();
              doLogin(role, email, password);
            }}
          >
            <p className="text-sm font-bold uppercase tracking-wide">Sign in as {ROLE_META[role].label}</p>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.edu.in"
                  autoComplete="username"
                />
                {errors.email && <p className="text-xs font-semibold text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Any 6+ characters (demo)"
                  autoComplete="current-password"
                />
                {errors.password && <p className="text-xs font-semibold text-destructive">{errors.password}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Demo sign-in accepts any valid email and a password of 6+ characters for the selected role. Data is
                stored only in this browser (localStorage).
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
