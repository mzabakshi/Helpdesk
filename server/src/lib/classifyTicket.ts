import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import prisma from "../db";
import { TicketModel } from "../generated/prisma/models/Ticket";
import { TicketCategory } from "core";

const categories = Object.values(TicketCategory);

type TicketInput = Pick<TicketModel, "id" | "subject" | "body">;

export async function classifyTicket(ticket: TicketInput): Promise<void> {
  const { text } = await generateText({
    model: openai("gpt-4.1-nano"),
    messages: [
      {
        role: "system",
        content: `You are a support ticket classifier. Given a ticket subject and body, classify it into exactly one of these categories:
- general_question: General inquiries, how-to questions, feature questions
- technical_issue: Bugs, errors, login problems, performance issues, things not working
- refund_request: Refund requests, billing disputes, charge complaints

Respond with only the category name — no punctuation, no explanation.`,
      },
      {
        role: "user",
        content: `Subject: ${ticket.subject}\n\n${ticket.body}`,
      },
    ],
  });

  const category = text.trim().toLowerCase() as TicketCategory;
  if (!categories.includes(category)) {
    console.warn(`classifyTicket: unexpected category "${category}" for ticket ${ticket.id}`);
    return;
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { category },
  });
}
