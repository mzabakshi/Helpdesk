-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('general_question', 'technical_issue', 'refund_request');

-- AlterTable
ALTER TABLE "ticket" ADD COLUMN     "category" "TicketCategory" NOT NULL DEFAULT 'general_question';
