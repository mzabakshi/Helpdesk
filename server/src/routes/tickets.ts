import { Router } from "express";
import { z } from "zod";
import prisma from "../db";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

const sortableFields = ["subject", "fromName", "fromEmail", "status", "category", "createdAt"] as const;

const querySchema = z.object({
  sortBy: z.enum(sortableFields).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["open", "resolved", "closed"]).optional(),
  category: z.enum(["general_question", "technical_issue", "refund_request"]).optional(),
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
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json(ticket);
});

export default router;
