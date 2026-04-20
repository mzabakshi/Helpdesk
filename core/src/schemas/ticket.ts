import { z } from "zod";

export enum TicketStatus {
  Open = "open",
  Resolved = "resolved",
  Closed = "closed",
}

export enum TicketCategory {
  GeneralQuestion = "general_question",
  TechnicalIssue = "technical_issue",
  RefundRequest = "refund_request",
}

export const ticketSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: z.string(),
  fromEmail: z.string().email(),
  fromName: z.string(),
  status: z.enum(Object.values(TicketStatus) as [string, ...string[]]),
  category: z.enum(Object.values(TicketCategory) as [string, ...string[]]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Ticket = z.infer<typeof ticketSchema>;

export const assignTicketSchema = z.object({
  assignedToId: z.string().nullable(),
});
