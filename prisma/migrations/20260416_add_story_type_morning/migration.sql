-- CreateEnum
CREATE TYPE "StoryType" AS ENUM ('night', 'morning');

-- AlterTable: Add story_type and story_number to stories
ALTER TABLE "stories" ADD COLUMN "story_type" "StoryType" NOT NULL DEFAULT 'night';
ALTER TABLE "stories" ADD COLUMN "story_number" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "stories_user_id_story_type_idx" ON "stories"("user_id", "story_type");

-- CreateTable
CREATE TABLE "intake_snapshots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "answers_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "intake_snapshots_user_id_key" ON "intake_snapshots"("user_id");
CREATE INDEX "intake_snapshots_user_id_idx" ON "intake_snapshots"("user_id");

-- AddForeignKey
ALTER TABLE "intake_snapshots" ADD CONSTRAINT "intake_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
