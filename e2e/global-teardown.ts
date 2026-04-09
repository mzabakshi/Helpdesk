import { execSync } from "child_process";
import path from "path";

const serverDir = path.resolve(__dirname, "../server");

const testEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL!,
};

export default async function globalTeardown() {
  execSync("bun src/reset-test-db.ts", {
    cwd: serverDir,
    env: testEnv,
    stdio: "inherit",
  });
}
