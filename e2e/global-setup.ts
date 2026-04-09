import { execSync } from "child_process";
import path from "path";

const serverDir = path.resolve(__dirname, "../server");

const testEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL!,
};

export default async function globalSetup() {
  // Run migrations against the test database
  execSync("bunx prisma migrate deploy", {
    cwd: serverDir,
    env: testEnv,
    stdio: "inherit",
  });

  // Clear data and seed test users
  execSync("bun src/reset-test-db.ts", {
    cwd: serverDir,
    env: testEnv,
    stdio: "inherit",
  });
}
