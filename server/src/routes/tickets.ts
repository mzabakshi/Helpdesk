import { Router } from "express";
import { z } from "zod";
import prisma from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { assignTicketSchema, updateTicketSchema, createReplySchema, SenderType } from "core";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const router = Router();
router.use(requireAuth);

const sortableFields = ["subject", "fromName", "fromEmail", "status", "category", "createdAt"] as const;

const querySchema = z.object({
  sortBy: z.enum(sortableFields).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["open", "resolved", "closed"]).optional(),
  category: z.enum(["none", "general_question", "technical_issue", "refund_request"]).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

// GET /api/tickets
router.get("/", async (req, res) => {
  const { sortBy, order, status, category, search, page, pageSize } = querySchema.parse({
    sortBy: req.query.sortBy,
    order: req.query.order,
    status: req.query.status || undefined,
    category: req.query.category || undefined,
    search: req.query.search || undefined,
    page: req.query.page,
    pageSize: req.query.pageSize,
  });

  const where = {
    ...(status && { status }),
    ...(category && { category }),
    ...(search && {
      OR: [
        { subject: { contains: search, mode: "insensitive" as const } },
        { fromName: { contains: search, mode: "insensitive" as const } },
        { fromEmail: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      select: {
        id: true,
        subject: true,
        fromName: true,
        fromEmail: true,
        status: true,
        category: true,
        createdAt: true,
      },
      orderBy: { [sortBy]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ data: tickets, total, page, pageSize });
});

// GET /api/tickets/:id
router.get("/:id", async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json(ticket);
});

// PATCH /api/tickets/:id
router.patch("/:id", async (req, res) => {
  const parsed = updateTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const updated = await prisma.ticket.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  res.json(updated);
});

// PATCH /api/tickets/:id/assign
router.patch("/:id/assign", async (req, res) => {
  const parsed = assignTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { assignedToId } = parsed.data;

  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  if (assignedToId !== null) {
    const agent = await prisma.user.findFirst({
      where: { id: assignedToId, deletedAt: null },
    });
    if (!agent) {
      res.status(400).json({ error: "Agent not found" });
      return;
    }
  }

  const updated = await prisma.ticket.update({
    where: { id: req.params.id },
    data: { assignedToId },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  res.json(updated);
});

// GET /api/tickets/:id/replies
router.get("/:id/replies", async (req, res) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await prisma.reply.findMany({
    where: { ticketId: req.params.id },
    select: {
      id: true,
      body: true,
      senderType: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  res.json(replies);
});

// POST /api/tickets/:id/replies
router.post("/:id/replies", async (req, res) => {
  const parsed = createReplySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const reply = await prisma.reply.create({
    data: {
      body: parsed.data.body,
      senderType: SenderType.Agent,
      ticketId: req.params.id,
      authorId: req.session!.user.id,
    },
    select: {
      id: true,
      body: true,
      senderType: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(reply);
});

// POST /api/tickets/:id/polish-reply
router.post("/:id/polish-reply", async (req, res) => {
  const parsed = z.object({ body: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "body is required" });
    return;
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: { fromName: true },
    });

    const customerName = ticket?.fromName ?? "there";
    const agentName = req.session!.user.name;

    const { text } = await generateText({
      model: openai("gpt-4.1-nano"),
      messages: [
        {
          role: "system",
          content:
            `You are a helpful assistant that polishes customer support replies. Improve the grammar, tone, and clarity of the agent's reply. Keep the meaning and intent intact. Start the reply with "Dear ${customerName}," on its own line. Do not add a sign-off or signature — that will be added separately. Return only the improved reply text with no extra commentary.`,
        },
        { role: "user", content: parsed.data.body },
      ],
    });

    res.json({ body: `${text}\n\nBest regards,\n${agentName}` });
  } catch (err) {
    console.error("Polish reply error:", err);
    res.status(500).json({ error: "Failed to polish reply" });
  }
});

export default router;
