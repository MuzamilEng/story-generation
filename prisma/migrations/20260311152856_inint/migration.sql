-- AlterTable
ALTER TABLE "users" ADD COLUMN     "evening_reminder" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "morning_reminder" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "product_updates" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "streak_milestones" BOOLEAN NOT NULL DEFAULT true;
