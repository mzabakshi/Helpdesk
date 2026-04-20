import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { TicketStatus, TicketCategory } from "core";
import { Skeleton } from "@/components/ui/skeleton";
import TicketsTable from "./TicketsTable";

interface Ticket {
  id: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  status: TicketStatus;
  category: TicketCategory;
  createdAt: string;
}

export default function TicketsPage() {
  const { data: tickets = [], isLoading, error } = useQuery<Ticket[]>({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data } = await axios.get<Ticket[]>("/api/tickets", { withCredentials: true });
      return data;
    },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Tickets</h1>
      </div>

      {error && (
        <p className="text-destructive">
          {axios.isAxiosError(error) ? (error.response?.data?.error ?? error.message) : "Failed to load tickets"}
        </p>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      )}

      {!isLoading && !error && <TicketsTable tickets={tickets} />}
    </div>
  );
}
