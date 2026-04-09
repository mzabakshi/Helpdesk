import { hashPassword } from "better-auth/crypto";
import { generateId } from "better-auth";
import prisma from "./db";
import { Role } from "./generated/prisma/enums";

// Clear all data
await prisma.session.deleteMany();
await prisma.account.deleteMany();
await prisma.user.deleteMany();
console.log("Test DB cleared");

// Seed admin
const adminId = generateId();
const now = new Date();
await prisma.user.create({
  data: {
    id: adminId,
    name: "Admin",
    email: "admin@example.com",
    emailVerified: true,
    role: Role.admin,
    createdAt: now,
    updatedAt: now,
    accounts: {
      create: {
        id: generateId(),
        accountId: adminId,
        providerId: "credential",
        password: await hashPassword("password123"),
        createdAt: now,
        updatedAt: now,
      },
    },
  },
});
console.log("Admin user seeded: admin@example.com");

// Seed agent
const agentId = generateId();
await prisma.user.create({
  data: {
    id: agentId,
    name: "Agent",
    email: "agent@example.com",
    emailVerified: true,
    role: Role.agent,
    createdAt: now,
    updatedAt: now,
    accounts: {
      create: {
        id: generateId(),
        accountId: agentId,
        providerId: "credential",
        password: await hashPassword("password123"),
        createdAt: now,
        updatedAt: now,
      },
    },
  },
});
console.log("Agent user seeded: agent@example.com");

await prisma.$disconnect();
