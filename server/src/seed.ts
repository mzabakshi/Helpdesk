import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { generateId } from "better-auth";
import prisma from "./db";
import { Role } from "./generated/prisma/enums";

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!email || !password) {
  console.error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env");
  process.exit(1);
}

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.log(`Admin user ${email} already exists, skipping.`);
  process.exit(0);
}

const now = new Date();
const userId = generateId();

await prisma.user.create({
  data: {
    id: userId,
    name: "Admin",
    email,
    emailVerified: true,
    role: Role.admin,
    createdAt: now,
    updatedAt: now,
    accounts: {
      create: {
        id: generateId(),
        accountId: userId,
        providerId: "credential",
        password: await hashPassword(password),
        createdAt: now,
        updatedAt: now,
      },
    },
  },
});

console.log(`Admin user created: ${email}`);

// Seed a default agent for local development / e2e tests
const agentEmail = "agent@example.com";
const existingAgent = await prisma.user.findUnique({ where: { email: agentEmail } });
if (!existingAgent) {
  const agentId = generateId();
  await prisma.user.create({
    data: {
      id: agentId,
      name: "Agent",
      email: agentEmail,
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
  console.log(`Agent user created: ${agentEmail}`);
}

await prisma.$disconnect();
