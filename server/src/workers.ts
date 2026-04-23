import boss from "./boss";
import { classifyTicket } from "./lib/classifyTicket";

export const CLASSIFY_TICKET_QUEUE = "classify-ticket";

interface ClassifyTicketJobData {
  id: string;
  subject: string;
  body: string;
}

export async function startWorkers() {
  await boss.work<ClassifyTicketJobData>(CLASSIFY_TICKET_QUEUE, async (jobs) => {
    for (const job of jobs) {
      await classifyTicket(job.data);
    }
  });

  console.log("[pg-boss] workers started");
}
