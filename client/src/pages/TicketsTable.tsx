import { TicketStatus, TicketCategory } from "core";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Ticket {
  id: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  status: TicketStatus;
  category: TicketCategory;
  createdAt: string;
}

interface Props {
  tickets: Ticket[];
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

export default function TicketsTable({ tickets }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>From</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Received</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              No tickets found.
            </TableCell>
          </TableRow>
        )}
        {tickets.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell className="font-medium">{ticket.subject}</TableCell>
            <TableCell>
              <span className="block">{ticket.fromName}</span>
              <span className="text-sm text-muted-foreground">{ticket.fromEmail}</span>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant[ticket.status]}>
                {ticket.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {categoryLabel[ticket.category]}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(ticket.createdAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
