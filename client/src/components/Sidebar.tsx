import { Link, useLocation, useNavigate } from "react-router";
import { Role } from "core";
import { authClient } from "../lib/auth-client";
import { LayoutDashboard, Ticket, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/tickets", label: "Tickets", icon: Ticket, exact: false },
];

const ADMIN_NAV = [
  { to: "/users", label: "Users", icon: Users, exact: false },
];

export default function Sidebar() {
  const { data: session } = authClient.useSession();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut({ fetchOptions: { onSuccess: () => navigate("/login") } });
  };

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
      active
        ? "bg-sidebar-primary text-sidebar-primary-foreground"
        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    );

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-sidebar flex flex-col border-r border-sidebar-border z-20">
      <div className="h-14 flex items-center px-5 border-b border-sidebar-border shrink-0">
        <span className="text-sm font-semibold tracking-wide text-white">Helpdesk</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
          Navigation
        </p>
        {NAV.map(({ to, label, icon: Icon, exact }) => (
          <Link key={to} to={to} className={linkClass(isActive(to, exact))}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        {session?.user.role === Role.Admin && (
          <>
            <p className="px-3 pt-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
              Admin
            </p>
            {ADMIN_NAV.map(({ to, label, icon: Icon, exact }) => (
              <Link key={to} to={to} className={linkClass(isActive(to, exact))}>
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3 shrink-0">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs font-medium text-sidebar-foreground/90 truncate">{session?.user.name}</p>
          <p className="text-[11px] text-sidebar-foreground/40 truncate">{session?.user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
