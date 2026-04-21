import { useParams } from "react-router";
import AppLink from "@/components/AppLink";
import ReplyThread from "@/components/ReplyThread";
import TicketInfo from "@/components/TicketInfo";
import UpdateTicket from "@/components/UpdateTicket";
import TicketSummary from "@/components/TicketSummary";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { TicketStatus, TicketCategory } from "core";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
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

function errorMessage(err: unknown, fallback: string) {
  return axios.isAxiosError(err)
    ? (err.response?.data?.error ?? err.message)
    : fallback;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: ticket, isLoading, error } = useQuery<Ticket>({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const { data } = await axios.get<Ticket>(`/api/tickets/${id}`, {
        withCredentials: true,
      });
      return data;
    },
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
            <TicketInfo
              subject={ticket.subject}
              fromName={ticket.fromName}
              fromEmail={ticket.fromEmail}
              createdAt={ticket.createdAt}
              body={ticket.body}
            />

            <TicketSummary ticketId={ticket.id} />

            <ReplyThread ticketId={ticket.id} customerName={ticket.fromName} />
          </div>

          {/* Right column — controls */}
          <UpdateTicket
            ticketId={ticket.id}
            status={ticket.status}
            category={ticket.category}
            assignedTo={ticket.assignedTo}
          />
        </div>
      )}
    </div>
  );
}
