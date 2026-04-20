import { useParams } from "react-router";
import AppLink from "@/components/AppLink";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { TicketStatus, TicketCategory } from "core";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  body: string;
  fromName: string;
  fromEmail: string;
  status: TicketStatus;
  category: TicketCategory;
  createdAt: string;
  updatedAt: string;
}

const statusVariant: Record<TicketStatus, "default" | "secondary" | "outline"> = {
  [TicketStatus.Open]: "default",
  [TicketStatus.Resolved]: "secondary",
  [TicketStatus.Closed]: "outline",
};

const categoryLabel: Record<TicketCategory, string> = {
  [TicketCategory.GeneralQuestion]: "General Question",
  [TicketCategory.TechnicalIssue]: "Technical Issue",
  [TicketCategory.RefundRequest]: "Refund Request",
};

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
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="-ml-2" asChild>
          <AppLink to="/tickets" className="flex items-center hover:no-underline">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to tickets
          </AppLink>
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {error && (
        <p className="text-destructive">
          {axios.isAxiosError(error)
            ? (error.response?.data?.error ?? error.message)
            : "Failed to load ticket"}
        </p>
      )}

      {ticket && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold mb-2">{ticket.subject}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                From <span className="text-foreground font-medium">{ticket.fromName}</span>{" "}
                &lt;{ticket.fromEmail}&gt;
              </span>
              <span>·</span>
              <span>{new Date(ticket.createdAt).toLocaleString()}</span>
              <span>·</span>
              <Badge variant={statusVariant[ticket.status]}>{ticket.status}</Badge>
              <span className="text-muted-foreground">{categoryLabel[ticket.category]}</span>
            </div>
          </div>

          <div className="rounded-md border p-4 bg-muted/40 whitespace-pre-wrap text-sm leading-relaxed">
            {ticket.body}
          </div>
        </div>
      )}
    </div>
  );
}
