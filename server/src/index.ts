import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
