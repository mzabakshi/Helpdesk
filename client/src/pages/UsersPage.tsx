import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CreateUserDialog from "./CreateUserDialog";
import EditUserDialog from "./EditUserDialog";
import UsersTable from "./UsersTable";

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  createdAt: string;
};

type DialogState = { mode: "create" } | { mode: "edit"; user: User } | null;

export default function UsersPage() {
  const [dialog, setDialog] = useState<DialogState>(null);

  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await axios.get<User[]>("/api/users", { withCredentials: true });
      return data;
    },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Button onClick={() => setDialog({ mode: "create" })}>Add User</Button>
      </div>

      {error && (
        <p className="text-destructive">
          {axios.isAxiosError(error) ? (error.response?.data?.error ?? error.message) : "Failed to load users"}
        </p>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      )}

      {!isLoading && !error && (
        <UsersTable users={users} onEdit={(user) => setDialog({ mode: "edit", user })} />
      )}

      <CreateUserDialog
        open={dialog?.mode === "create"}
        onOpenChange={(isOpen) => { if (!isOpen) setDialog(null); }}
      />
      <EditUserDialog
        user={dialog?.mode === "edit" ? dialog.user : null}
        open={dialog?.mode === "edit"}
        onOpenChange={(isOpen) => { if (!isOpen) setDialog(null); }}
      />
    </div>
  );
}
