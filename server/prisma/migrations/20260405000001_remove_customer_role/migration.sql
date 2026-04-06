-- Migrate existing customer rows to agent
UPDATE "user" SET "role" = 'agent' WHERE "role" = 'customer';

-- Recreate enum without customer
ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "user" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT;
DROP TYPE "Role";
CREATE TYPE "Role" AS ENUM ('admin', 'agent');
ALTER TABLE "user" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'agent'::"Role";
