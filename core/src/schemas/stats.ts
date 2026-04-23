import { z } from "zod";

export const ticketsPerDaySchema = z.object({
  date: z.string(), // "YYYY-MM-DD"
  count: z.number(),
});

export const statsSchema = z.object({
  totalTickets: z.number(),
  openTickets: z.number(),
  resolvedByAI: z.number(),
  percentResolvedByAI: z.number(),
  avgResolutionTimeMs: z.number(),
  ticketsPerDay: z.array(ticketsPerDaySchema),
});

export type TicketsPerDay = z.infer<typeof ticketsPerDaySchema>;
export type Stats = z.infer<typeof statsSchema>;
