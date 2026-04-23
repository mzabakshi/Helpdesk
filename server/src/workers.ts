import boss from "./boss";
import { classifyTicket } from "./lib/classifyTicket";
import { autoResolveTicket } from "./lib/autoResolveTicket";

export const CLASSIFY_TICKET_QUEUE = "classify-ticket";
export const AUTO_RESOLVE_TICKET_QUEUE = "auto-resolve-ticket";

interface ClassifyTicketJobData {
  id: string;
  subject: string;
  body: string;
}

interface AutoResolveTicketJobData {
  id: string;
  subject: string;
  body: string;
  fromName: string;
}

export async function startWorkers() {
  await boss.work<ClassifyTicketJobData>(CLASSIFY_TICKET_QUEUE, async (jobs) => {
    for (const job of jobs) {
      await classifyTicket(job.data);
    }
  });

  await boss.work<AutoResolveTicketJobData>(AUTO_RESOLVE_TICKET_QUEUE, async (jobs) => {
    for (const job of jobs) {
      await autoResolveTicket(job.data);
    }
  });

  console.log("[pg-boss] workers started");
}
