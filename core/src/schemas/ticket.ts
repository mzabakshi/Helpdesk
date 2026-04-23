import { z } from "zod";

export enum TicketStatus {
  New = "new",
  Processing = "processing",
  Open = "open",
  Resolved = "resolved",
  Closed = "closed",
}

export enum TicketCategory {
  None = "none",
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

export const updateTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
});
