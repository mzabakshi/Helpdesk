import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import prisma from "../db";
import { SenderType } from "../generated/prisma/enums";
import { TicketModel } from "../generated/prisma/models/Ticket";

type TicketInput = Pick<TicketModel, "id" | "subject" | "body" | "fromName">;

const knowledgeBase = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../knowledge-base.md"),
  "utf-8"
);

export async function autoResolveTicket(ticket: TicketInput): Promise<void> {
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "processing" },
  });

  let text: string;
  try {
    ({ text } = await generateText({
    model: openai("gpt-4.1-nano"),
    messages: [
      {
        role: "system",
        content: `You are a customer support AI. Use only the knowledge base below to answer tickets.

${knowledgeBase}

Rules:
- If the knowledge base contains enough information to fully answer the ticket, respond with valid JSON: {"resolved": true, "reply": "<your reply to the customer>"}
- If the ticket requires escalation (legal threats, refund outside 30 days, chargeback disputes, account security concerns, or anything the KB does not cover), respond with: {"resolved": false, "reply": null}
- Address the customer by their first name.
- Keep replies concise, professional, and customer-friendly.
- End every reply with exactly: "Best regards,\nHelpdesk Support"
- Reply ONLY with the JSON object — no markdown, no explanation.`,
      },
      {
        role: "user",
        content: `Customer name: ${ticket.fromName}\nSubject: ${ticket.subject}\n\n${ticket.body}`,
      },
    ],
  }));
  } catch (err) {
    console.error(`autoResolveTicket: generateText failed for ticket ${ticket.id}:`, err);
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "open", assignedToId: null } });
    return;
  }

  let parsed: { resolved: boolean; reply: string | null };
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    console.warn(`autoResolveTicket: invalid JSON response for ticket ${ticket.id}:`, text);
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "open", assignedToId: null } });
    return;
  }

  if (parsed.resolved && parsed.reply) {
    await prisma.$transaction([
      prisma.reply.create({
        data: {
          body: parsed.reply,
          senderType: SenderType.ai,
          ticketId: ticket.id,
          authorId: null,
        },
      }),
      prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: "resolved" },
      }),
    ]);
  } else {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "open", assignedToId: null },
    });
  }
}
