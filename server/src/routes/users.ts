import { Router } from "express";
import { hashPassword } from "better-auth/crypto";
import { generateId } from "better-auth";
import { createUserSchema, editUserSchema } from "core";
import prisma from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";

function firstIssue(error: { issues: { message: string }[] }) {
  return error.issues[0].message;
}

const router = Router();

router.use(requireAuth, requireAdmin);

// GET /api/users
router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

// POST /api/users
router.post("/", async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssue(parsed.error) });
    return;
  }
  const { name, email, password } = parsed.data;

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
      role: "agent",
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

// PATCH /api/users/:id
router.patch("/:id", async (req, res) => {
  const parsed = editUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: firstIssue(parsed.error) });
    return;
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const emailTaken = await prisma.user.findFirst({
    where: { email, NOT: { id: req.params.id } },
  });
  if (emailTaken) {
    res.status(409).json({ error: "A user with that email already exists" });
    return;
  }

  const now = new Date();

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { name, email, updatedAt: now },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (password && password.trim() !== "") {
    const hashed = await hashPassword(password);
    await prisma.account.updateMany({
      where: { userId: req.params.id, providerId: "credential" },
      data: { password: hashed, updatedAt: now },
    });
  }

  res.json(user);
});

// DELETE /api/users/:id
router.delete("/:id", async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.role === "admin") {
    res.status(403).json({ error: "Admin users cannot be deleted." });
    return;
  }
  await prisma.$transaction([
    prisma.ticket.updateMany({
      where: { assignedToId: req.params.id },
      data: { assignedToId: null },
    }),
    prisma.user.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    }),
  ]);
  res.status(204).send();
});

export default router;
