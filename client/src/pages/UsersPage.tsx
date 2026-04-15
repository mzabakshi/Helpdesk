import { useState } from "react";
import axios from "axios";
import { Role } from "core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CreateUserDialog from "./CreateUserDialog";
import EditUserDialog from "./EditUserDialog";
import UsersTable from "./UsersTable";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; user: User }
  | { mode: "delete"; user: User }
  | null;

export default function UsersPage() {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await axios.get<User[]>("/api/users", { withCredentials: true });
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      axios.delete(`/api/users/${id}`, { withCredentials: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDialog(null);
      setDeleteError(null);
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setDeleteError(err.response?.data?.error ?? err.message);
      } else {
        setDeleteError("Failed to delete user.");
      }
    },
  });

  const userToDelete = dialog?.mode === "delete" ? dialog.user : null;

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
        <UsersTable
          users={users}
          onEdit={(user) => setDialog({ mode: "edit", user })}
          onDelete={(user) => { setDeleteError(null); setDialog({ mode: "delete", user }); }}
        />
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

      <AlertDialog
        open={dialog?.mode === "delete"}
        onOpenChange={(isOpen) => { if (!isOpen) { setDialog(null); setDeleteError(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-destructive text-sm px-1">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => userToDelete && deleteMutation.mutate(userToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
