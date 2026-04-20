import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import usersRouter from "./routes/users";
import webhooksRouter from "./routes/webhooks";
import ticketsRouter from "./routes/tickets";
import agentsRouter from "./routes/agents";
import prisma from "./db";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "http://localhost:5173").split(",");
app.use(cors({ origin: trustedOrigins, credentials: true }));

if (process.env.NODE_ENV === "production") {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", apiLimiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/auth/sign-in", authLimiter);
}

app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/users", usersRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/webhooks", webhooksRouter);

// Test-only route: never enabled in production.
// Returns the most recent ticket matching an optional ?subject= query param.
if (process.env.NODE_ENV !== "production") {
  app.get("/api/test/tickets/latest", async (req, res) => {
    const subject = req.query.subject as string | undefined;
    const ticket = await prisma.ticket.findFirst({
      where: subject ? { subject } : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.json(ticket ?? null);
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
