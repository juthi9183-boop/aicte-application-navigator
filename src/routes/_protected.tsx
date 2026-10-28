import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth";
import { useSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_protected")({
  beforeLoad: () => {
    // Simulated auth: server has no session storage, so hard refreshes of
    // protected routes fall back to the sign-in page.
    if (typeof window === "undefined") throw redirect({ to: "/" });
    if (!getSession()) throw redirect({ to: "/" });
  },
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const session = useSession();
  if (!session) return null;
  return <AppShell session={session}>{<Outlet />}</AppShell>;
}
