-- CreateEnum
CREATE TYPE "NotificationHistoryStatus" AS ENUM ('pending', 'delivered', 'failed');

-- AlterTable
ALTER TABLE "notification_history"
  ADD COLUMN "status" "NotificationHistoryStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "deliveryDetails" JSONB;
