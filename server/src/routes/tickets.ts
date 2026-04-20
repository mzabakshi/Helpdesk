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
});

// GET /api/tickets
router.get("/", async (req, res) => {
  const { sortBy, order, status, category, search } = querySchema.parse({
    sortBy: req.query.sortBy,
    order: req.query.order,
    status: req.query.status || undefined,
    category: req.query.category || undefined,
    search: req.query.search || undefined,
  });

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(status && { status }),
      ...(category && { category }),
      ...(search && {
        OR: [
          { subject: { contains: search, mode: "insensitive" } },
          { fromName: { contains: search, mode: "insensitive" } },
          { fromEmail: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
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
  });
  res.json(tickets);
});

export default router;
