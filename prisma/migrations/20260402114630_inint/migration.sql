/*
  Warnings:

  - The `soundscape` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "soundscape",
ADD COLUMN     "soundscape" TEXT NOT NULL DEFAULT 'none';

-- CreateTable
CREATE TABLE "soundscape_assets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image_url" TEXT,
    "r2_key" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "duration_s" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soundscape_assets_pkey" PRIMARY KEY ("id")
);
