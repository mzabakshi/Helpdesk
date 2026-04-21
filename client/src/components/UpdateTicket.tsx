import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TicketStatus, TicketCategory } from "core";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Agent {
  id: string;
  name: string;
}

interface UpdateTicketProps {
  ticketId: string;
  status: TicketStatus;
  category: TicketCategory;
  assignedTo: Agent | null;
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

export default function UpdateTicket({ ticketId, status, category, assignedTo }: UpdateTicketProps) {
  const queryClient = useQueryClient();

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
      axios.patch(`/api/tickets/${ticketId}`, patch, { withCredentials: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] }),
  });

  const assignMutation = useMutation({
    mutationFn: (assignedToId: string | null) =>
      axios.patch(`/api/tickets/${ticketId}/assign`, { assignedToId }, { withCredentials: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] }),
  });

  return (
    <div className="w-52 shrink-0 space-y-5 pt-1">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
        <Select
          value={status}
          onValueChange={(v) => updateMutation.mutate({ status: v as TicketStatus })}
          disabled={updateMutation.isPending}
        >
          <SelectTrigger className="w-full h-8 text-sm" aria-label="Status">
            <SelectValue>{statusLabel[status]}</SelectValue>
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
          value={category}
          onValueChange={(v) => updateMutation.mutate({ category: v as TicketCategory })}
          disabled={updateMutation.isPending}
        >
          <SelectTrigger className="w-full h-8 text-sm" aria-label="Category">
            <SelectValue>{categoryLabel[category]}</SelectValue>
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
          value={assignedTo?.id ?? "unassigned"}
          onValueChange={(v) => assignMutation.mutate(v === "unassigned" ? null : v)}
          disabled={assignMutation.isPending}
        >
          <SelectTrigger className="w-full h-8 text-sm" aria-label="Assigned to">
            <SelectValue>{assignedTo?.name ?? "Unassigned"}</SelectValue>
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
  );
}
