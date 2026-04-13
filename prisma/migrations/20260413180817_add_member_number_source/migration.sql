/*
  Warnings:

  - A unique constraint covering the columns `[member_number]` on the table `waitlist_entries` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "waitlist_entries" ADD COLUMN     "member_number" SERIAL NOT NULL,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'direct';

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_member_number_key" ON "waitlist_entries"("member_number");
