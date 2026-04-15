-- DropIndex
DROP INDEX "waitlist_entries_member_number_key";

-- AlterTable
ALTER TABLE "waitlist_entries" DROP COLUMN "member_number",
DROP COLUMN "source";
