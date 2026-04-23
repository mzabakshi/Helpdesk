import { Router } from "express";
import prisma from "../db";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

// GET /api/stats — dashboard metrics computed by PostgreSQL stored functions
router.get("/", async (_req, res) => {
  const [scalarRows, perDayRows] = await Promise.all([
    prisma.$queryRaw<
      {
        total_tickets: bigint;
        open_tickets: bigint;
        resolved_by_ai: bigint;
        percent_resolved_by_ai: number;
        avg_resolution_time_ms: number;
      }[]
    >`SELECT * FROM get_dashboard_stats()`,

    prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT * FROM get_tickets_per_day(30)
    `,
  ]);

  const s = scalarRows[0];

  res.json({
    totalTickets: Number(s.total_tickets),
    openTickets: Number(s.open_tickets),
    resolvedByAI: Number(s.resolved_by_ai),
    percentResolvedByAI: s.percent_resolved_by_ai,
    avgResolutionTimeMs: s.avg_resolution_time_ms,
    ticketsPerDay: perDayRows.map((r) => ({
      date: r.day,
      count: Number(r.count),
    })),
  });
});

export default router;

