import { Router } from "express";
import { z } from "zod";
import prisma from "../db";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

const sortableFields = ["subject", "fromName", "fromEmail", "status", "category", "createdAt"] as const;

const sortSchema = z.object({
  sortBy: z.enum(sortableFields).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// GET /api/tickets
router.get("/", async (req, res) => {
  const { sortBy, order } = sortSchema.parse({
    sortBy: req.query.sortBy,
    order: req.query.order,
  });

  const tickets = await prisma.ticket.findMany({
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
