import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/applications/$id")({
  component: () => <Outlet />,
});
