import { Router } from "express";
import multer from "multer";
import prisma from "../db";
import boss from "../boss";
import { CLASSIFY_TICKET_QUEUE } from "../workers";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/webhooks/inbound
// Accepts multipart/form-data from SendGrid Inbound Parse.
// Requires ?token=WEBHOOK_SECRET query param for simple shared-secret auth.
router.post("/inbound", upload.any(), async (req, res) => {
  if (req.query.token !== process.env.WEBHOOK_SECRET) {
    res.status(401).send();
    return;
  }

  const { from, subject, text } = req.body as Record<string, string>;

  // Parse "Name <email@example.com>" or plain "email@example.com"
  const match = from?.match(/^(.*?)\s*<(.+?)>$/) ?? null;
  const fromName = match ? match[1].trim() || "Unknown" : (from ?? "Unknown");
  const fromEmail = match ? match[2].trim() : (from ?? "");

  const ticket = await prisma.ticket.create({
    data: {
      subject: subject?.trim() || "(no subject)",
      body: text ?? "",
      fromEmail,
      fromName,
    },
  });

  // Enqueue classification — pg-boss handles retries and persistence
  await boss.send(CLASSIFY_TICKET_QUEUE, {
    id: ticket.id,
    subject: ticket.subject,
    body: ticket.body,
  });

  res.status(200).send();
});

export default router;
