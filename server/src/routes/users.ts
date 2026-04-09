import { Router } from "express";
import { hashPassword } from "better-auth/crypto";
import { generateId } from "better-auth";
import prisma from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

router.use(requireAuth, requireAdmin);

// GET /api/users
router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

// POST /api/users
router.post("/", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email, and password are required" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "A user with that email already exists" });
    return;
  }

  const hashed = await hashPassword(password);
  const id = generateId();
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      id,
      name,
      email,
      emailVerified: false,
      role: role === "admin" ? "admin" : "agent",
      createdAt: now,
      updatedAt: now,
      accounts: {
        create: {
          id: generateId(),
          accountId: id,
          providerId: "credential",
          password: hashed,
          createdAt: now,
          updatedAt: now,
        },
      },
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.status(201).json(user);
});

export default router;
