/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('email', 'google', 'apple');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('free', 'single', 'standard', 'power');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('draft', 'approved', 'audio_ready');

-- CreateEnum
CREATE TYPE "VersionSource" AS ENUM ('original', 'edited', 'regenerated');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('play', 'download', 'sample_play');

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "auth_provider" "AuthProvider" NOT NULL DEFAULT 'email',
    "plan" "Plan" NOT NULL DEFAULT 'free',
    "plan_started_at" TIMESTAMP(3),
    "plan_renewed_at" TIMESTAMP(3),
    "stories_this_month" INTEGER NOT NULL DEFAULT 0,
    "audio_mins_this_month" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_stories_ever" INTEGER NOT NULL DEFAULT 0,
    "total_audio_plays" INTEGER NOT NULL DEFAULT 0,
    "total_downloads" INTEGER NOT NULL DEFAULT 0,
    "streak_days" INTEGER NOT NULL DEFAULT 0,
    "streak_last_date" TIMESTAMP(3),
    "voice_model_id" TEXT,
    "voice_sample_url" TEXT,
    "email_verified" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "status" "StoryStatus" NOT NULL,
    "goal_intake_json" JSONB NOT NULL,
    "story_text_draft" TEXT,
    "story_text_approved" TEXT,
    "word_count" INTEGER,
    "audio_url" TEXT,
    "audio_r2_key" TEXT,
    "audio_duration_secs" INTEGER,
    "audio_file_size_bytes" BIGINT,
    "audio_version" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "elevenlabs_history_id" VARCHAR(100),
    "play_count" INTEGER NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "approved_at" TIMESTAMP(3),
    "audio_generated_at" TIMESTAMP(3),

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_versions" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "word_count" INTEGER NOT NULL,
    "source" "VersionSource" NOT NULL,
    "regen_prompt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_audio_versions" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "audio_version" INTEGER NOT NULL,
    "r2_key" TEXT NOT NULL,
    "duration_s" INTEGER,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_audio_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "play_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "event_type" "EventType" NOT NULL,
    "duration_secs" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "play_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_limits" (
    "id" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "max_library_stories" INTEGER NOT NULL,
    "stories_per_month" INTEGER,
    "audio_mins_per_month" INTEGER,
    "audio_length_secs" INTEGER NOT NULL,
    "audio_length_desc" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "stories_user_id_idx" ON "stories"("user_id");

-- CreateIndex
CREATE INDEX "stories_status_idx" ON "stories"("status");

-- CreateIndex
CREATE INDEX "stories_created_at_idx" ON "stories"("created_at");

-- CreateIndex
CREATE INDEX "story_versions_story_id_idx" ON "story_versions"("story_id");

-- CreateIndex
CREATE INDEX "story_versions_created_at_idx" ON "story_versions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "story_versions_story_id_version_key" ON "story_versions"("story_id", "version");

-- CreateIndex
CREATE INDEX "story_audio_versions_story_id_idx" ON "story_audio_versions"("story_id");

-- CreateIndex
CREATE INDEX "story_audio_versions_created_at_idx" ON "story_audio_versions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "story_audio_versions_story_id_audio_version_key" ON "story_audio_versions"("story_id", "audio_version");

-- CreateIndex
CREATE INDEX "play_events_user_id_idx" ON "play_events"("user_id");

-- CreateIndex
CREATE INDEX "play_events_story_id_idx" ON "play_events"("story_id");

-- CreateIndex
CREATE INDEX "play_events_event_type_idx" ON "play_events"("event_type");

-- CreateIndex
CREATE INDEX "play_events_created_at_idx" ON "play_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "plan_limits_plan_key" ON "plan_limits"("plan");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_versions" ADD CONSTRAINT "story_versions_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_audio_versions" ADD CONSTRAINT "story_audio_versions_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_events" ADD CONSTRAINT "play_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_events" ADD CONSTRAINT "play_events_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
