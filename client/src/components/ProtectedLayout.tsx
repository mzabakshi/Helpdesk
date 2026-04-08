import { Navigate, Outlet } from "react-router";
import { authClient } from "../lib/auth-client";
import NavBar from "./NavBar";

export default function ProtectedLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-gray-500 text-sm">Loading...</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
