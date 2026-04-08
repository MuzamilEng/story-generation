/*
  Warnings:

  - You are about to drop the column `voice_cloned_at` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "voice_cloned_at",
ADD COLUMN     "elevenlabs_voice_id" TEXT;

-- CreateTable
CREATE TABLE "voice_samples" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'My Voice',
    "r2_key" TEXT NOT NULL,
    "sample_url" TEXT NOT NULL,
    "duration_s" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_samples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "voice_samples_user_id_idx" ON "voice_samples"("user_id");

-- AddForeignKey
ALTER TABLE "voice_samples" ADD CONSTRAINT "voice_samples_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
