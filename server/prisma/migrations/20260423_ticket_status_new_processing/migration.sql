-- Add new enum values to TicketStatus
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'new';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'processing';

-- Drop autoResolved column
ALTER TABLE "ticket" DROP COLUMN IF EXISTS "autoResolved";

-- Change default status to 'new'
ALTER TABLE "ticket" ALTER COLUMN "status" SET DEFAULT 'new';
