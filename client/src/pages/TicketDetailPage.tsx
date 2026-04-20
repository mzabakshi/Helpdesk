import { useParams } from "react-router";
import AppLink from "@/components/AppLink";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TicketStatus, TicketCategory } from "core";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

interface Agent {
  id: string;
  name: string;
}

interface Ticket {
  id: string;
  subject: string;
  body: string;
  fromName: string;
  fromEmail: string;
  status: TicketStatus;
  category: TicketCategory;
  assignedTo: Agent | null;
  createdAt: string;
  updatedAt: string;
}

const statusOptions: { label: string; value: TicketStatus }[] = [
  { label: "Open", value: TicketStatus.Open },
  { label: "Resolved", value: TicketStatus.Resolved },
  { label: "Closed", value: TicketStatus.Closed },
];

const categoryOptions: { label: string; value: TicketCategory }[] = [
  { label: "None", value: TicketCategory.None },
  { label: "General Question", value: TicketCategory.GeneralQuestion },
  { label: "Technical Issue", value: TicketCategory.TechnicalIssue },
  { label: "Refund Request", value: TicketCategory.RefundRequest },
];

const statusLabel: Record<TicketStatus, string> = {
  [TicketStatus.Open]: "Open",
  [TicketStatus.Resolved]: "Resolved",
  [TicketStatus.Closed]: "Closed",
};

const categoryLabel: Record<TicketCategory, string> = {
  [TicketCategory.None]: "None",
  [TicketCategory.GeneralQuestion]: "General Question",
  [TicketCategory.TechnicalIssue]: "Technical Issue",
  [TicketCategory.RefundRequest]: "Refund Request",
};

function errorMessage(err: unknown, fallback: string) {
  return axios.isAxiosError(err)
    ? (err.response?.data?.error ?? err.message)
    : fallback;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: ticket, isLoading, error } = useQuery<Ticket>({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const { data } = await axios.get<Ticket>(`/api/tickets/${id}`, {
        withCredentials: true,
      });
      return data;
    },
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data } = await axios.get<Agent[]>("/api/agents", {
        withCredentials: true,
      });
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (patch: { status?: TicketStatus; category?: TicketCategory }) =>
      axios.patch(`/api/tickets/${id}`, patch, { withCredentials: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket", id] }),
  });

  const assignMutation = useMutation({
    mutationFn: (assignedToId: string | null) =>
      axios.patch(`/api/tickets/${id}/assign`, { assignedToId }, { withCredentials: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket", id] }),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <AppLink
          to="/tickets"
          className={buttonVariants({ variant: "ghost", size: "sm" }) + " -ml-2 hover:no-underline"}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to tickets
        </AppLink>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {error && (
        <p className="text-destructive">{errorMessage(error, "Failed to load ticket")}</p>
      )}

      {ticket && (
        <div className="flex gap-8 items-start">
          {/* Left column — ticket content */}
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <h1 className="text-2xl font-semibold mb-1">{ticket.subject}</h1>
              <p className="text-sm text-muted-foreground">
                From <span className="text-foreground font-medium">{ticket.fromName}</span>{" "}
                &lt;{ticket.fromEmail}&gt; · {new Date(ticket.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="rounded-md border p-4 bg-muted/40 whitespace-pre-wrap text-sm leading-relaxed">
              {ticket.body}
            </div>
          </div>

          {/* Right column — controls */}
          <div className="w-52 shrink-0 space-y-5 pt-1">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
              <Select
                value={ticket.status}
                onValueChange={(v) => updateMutation.mutate({ status: v as TicketStatus })}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger className="w-full h-8 text-sm" aria-label="Status">
                  <SelectValue>{statusLabel[ticket.status]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {updateMutation.isError && (
                <p className="text-xs text-destructive">
                  {errorMessage(updateMutation.error, "Failed to update")}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</p>
              <Select
                value={ticket.category}
                onValueChange={(v) => updateMutation.mutate({ category: v as TicketCategory })}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger className="w-full h-8 text-sm" aria-label="Category">
                  <SelectValue>{categoryLabel[ticket.category]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned to</p>
              <Select
                value={ticket.assignedTo?.id ?? "unassigned"}
                onValueChange={(v) => assignMutation.mutate(v === "unassigned" ? null : v)}
                disabled={assignMutation.isPending}
              >
                <SelectTrigger className="w-full h-8 text-sm" aria-label="Assigned to">
                  <SelectValue>{ticket.assignedTo?.name ?? "Unassigned"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignMutation.isError && (
                <p className="text-xs text-destructive">
                  {errorMessage(assignMutation.error, "Failed to assign")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
