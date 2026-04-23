import { Router } from "express";
import multer from "multer";
import prisma from "../db";
import boss from "../boss";
import { CLASSIFY_TICKET_QUEUE, AUTO_RESOLVE_TICKET_QUEUE } from "../workers";

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

  // Assign to AI agent if one is configured
  const aiAgentEmail = process.env.SEED_AI_AGENT_EMAIL;
  if (aiAgentEmail) {
    const aiAgent = await prisma.user.findUnique({ where: { email: aiAgentEmail } });
    if (aiAgent) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { assignedToId: aiAgent.id },
      });
    }
  }

  // Enqueue classification and auto-resolve — pg-boss handles retries and persistence
  await Promise.all([
    boss.send(CLASSIFY_TICKET_QUEUE, {
      id: ticket.id,
      subject: ticket.subject,
      body: ticket.body,
    }),
    boss.send(AUTO_RESOLVE_TICKET_QUEUE, {
      id: ticket.id,
      subject: ticket.subject,
      body: ticket.body,
      fromName: ticket.fromName,
    }),
  ]);

  res.status(200).send();
});

export default router;
