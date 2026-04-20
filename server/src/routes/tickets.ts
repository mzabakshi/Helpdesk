import { Router } from "express";
import prisma from "../db";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

// GET /api/tickets
router.get("/", async (_req, res) => {
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
    orderBy: { createdAt: "desc" },
  });
  res.json(tickets);
});

export default router;
