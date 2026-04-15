import { Link, useNavigate } from "react-router";
import { Role } from "core";
import { authClient } from "../lib/auth-client";

export default function NavBar() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => navigate("/login"),
      },
    });
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-semibold text-gray-800">Helpdesk</Link>
        {session?.user.role === Role.Admin && (
          <Link to="/users" className="text-sm text-gray-600 hover:text-gray-900">
            Users
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{session?.user.name}</span>
        <button
          onClick={handleSignOut}
          className="text-sm text-white bg-gray-700 hover:bg-gray-800 px-3 py-1.5 rounded"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
