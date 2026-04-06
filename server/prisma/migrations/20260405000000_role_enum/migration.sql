DROP TYPE IF EXISTS "Role";
CREATE TYPE "Role" AS ENUM ('admin', 'agent', 'customer');

ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "user" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'customer'::"Role";
