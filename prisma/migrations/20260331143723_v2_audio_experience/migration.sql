-- CreateEnum
CREATE TYPE "Soundscape" AS ENUM ('none', 'ocean', 'river', 'rain', 'uplifting');

-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "affirmations_json" JSONB,
ADD COLUMN     "binaural_audio_key" TEXT,
ADD COLUMN     "combined_audio_key" TEXT,
ADD COLUMN     "soundscape_audio_key" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "binaural_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "soundscape" "Soundscape" NOT NULL DEFAULT 'none';

-- CreateTable
CREATE TABLE "system_audio" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "r2_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "duration_s" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_audio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_audio_key_key" ON "system_audio"("key");
