import { Navigate, Outlet } from "react-router";
import { Role } from "core";
import { authClient } from "../lib/auth-client";
import Sidebar from "./Sidebar";

export default function AdminLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.user.role !== Role.Admin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
