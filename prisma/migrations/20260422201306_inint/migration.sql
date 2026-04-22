-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Soundscape" AS ENUM ('none', 'ocean', 'river', 'rain', 'uplifting');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('email', 'google', 'apple');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('free', 'activator', 'manifester', 'amplifier');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('draft', 'approved', 'awaited_voice_generation', 'audio_ready');

-- CreateEnum
CREATE TYPE "StoryType" AS ENUM ('night', 'morning');

-- CreateEnum
CREATE TYPE "VersionSource" AS ENUM ('original', 'edited', 'regenerated');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('play', 'download', 'sample_play');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "full_name" TEXT,
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
    "elevenlabs_voice_id" TEXT,
    "voice_sample_url" TEXT,
    "morning_reminder" BOOLEAN NOT NULL DEFAULT true,
    "evening_reminder" BOOLEAN NOT NULL DEFAULT true,
    "streak_milestones" BOOLEAN NOT NULL DEFAULT true,
    "product_updates" BOOLEAN NOT NULL DEFAULT false,
    "email_verified" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "stripe_current_period_end" TIMESTAMP(3),
    "stripe_customer_id" TEXT,
    "stripe_price_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "binaural_enabled" BOOLEAN NOT NULL DEFAULT false,
    "soundscape" TEXT NOT NULL DEFAULT 'none',
    "is_beta" BOOLEAN NOT NULL DEFAULT false,
    "beta_source" TEXT,
    "has_completed_survey" BOOLEAN NOT NULL DEFAULT false,
    "feedback_state" VARCHAR(30) NOT NULL DEFAULT 'pending_early',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "story_type" "StoryType" NOT NULL DEFAULT 'night',
    "story_number" INTEGER NOT NULL DEFAULT 1,
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
    "story_length_option" VARCHAR(20),
    "affirmations_json" JSONB,
    "binaural_audio_key" TEXT,
    "combined_audio_key" TEXT,
    "soundscape_audio_key" TEXT,
    "voice_only_r2_key" TEXT,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake_snapshots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "answers_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_snapshots_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "beta_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'amplifier_2_months',
    "max_uses" INTEGER NOT NULL DEFAULT 1,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beta_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_beta_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_id" TEXT NOT NULL,
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "user_beta_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beta_feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beta_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beta_signups" (
    "id" TEXT NOT NULL,
    "access_code" VARCHAR(14) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "referral" VARCHAR(50),
    "referral_detail" VARCHAR(255),
    "status" VARCHAR(30) NOT NULL DEFAULT 'signed_up',
    "user_id" TEXT,
    "email_day1_sent_at" TIMESTAMP(3),
    "email_day2_sent_at" TIMESTAMP(3),
    "email_day7_sent_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "survey1_completed_at" TIMESTAMP(3),
    "survey2_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beta_signups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beta_survey_responses" (
    "id" TEXT NOT NULL,
    "beta_signup_id" TEXT,
    "user_id" TEXT,
    "survey_type" VARCHAR(20) NOT NULL,
    "responses" JSONB NOT NULL,
    "source" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beta_survey_responses_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_subscription_id_key" ON "users"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "stories_user_id_idx" ON "stories"("user_id");

-- CreateIndex
CREATE INDEX "stories_status_idx" ON "stories"("status");

-- CreateIndex
CREATE INDEX "stories_created_at_idx" ON "stories"("created_at");

-- CreateIndex
CREATE INDEX "stories_user_id_story_type_idx" ON "stories"("user_id", "story_type");

-- CreateIndex
CREATE UNIQUE INDEX "intake_snapshots_user_id_key" ON "intake_snapshots"("user_id");

-- CreateIndex
CREATE INDEX "intake_snapshots_user_id_idx" ON "intake_snapshots"("user_id");

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

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "beta_codes_code_key" ON "beta_codes"("code");

-- CreateIndex
CREATE INDEX "user_beta_codes_user_id_idx" ON "user_beta_codes"("user_id");

-- CreateIndex
CREATE INDEX "user_beta_codes_code_id_idx" ON "user_beta_codes"("code_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_beta_codes_user_id_code_id_key" ON "user_beta_codes"("user_id", "code_id");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_email_key" ON "waitlist_entries"("email");

-- CreateIndex
CREATE UNIQUE INDEX "beta_feedback_userId_key" ON "beta_feedback"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "beta_signups_access_code_key" ON "beta_signups"("access_code");

-- CreateIndex
CREATE UNIQUE INDEX "beta_signups_email_key" ON "beta_signups"("email");

-- CreateIndex
CREATE UNIQUE INDEX "beta_signups_user_id_key" ON "beta_signups"("user_id");

-- CreateIndex
CREATE INDEX "beta_signups_email_idx" ON "beta_signups"("email");

-- CreateIndex
CREATE INDEX "beta_signups_access_code_idx" ON "beta_signups"("access_code");

-- CreateIndex
CREATE INDEX "beta_signups_status_idx" ON "beta_signups"("status");

-- CreateIndex
CREATE INDEX "beta_survey_responses_beta_signup_id_idx" ON "beta_survey_responses"("beta_signup_id");

-- CreateIndex
CREATE INDEX "beta_survey_responses_user_id_idx" ON "beta_survey_responses"("user_id");

-- CreateIndex
CREATE INDEX "beta_survey_responses_survey_type_idx" ON "beta_survey_responses"("survey_type");

-- CreateIndex
CREATE UNIQUE INDEX "system_audio_key_key" ON "system_audio"("key");

-- CreateIndex
CREATE INDEX "voice_samples_user_id_idx" ON "voice_samples"("user_id");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_snapshots" ADD CONSTRAINT "intake_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_versions" ADD CONSTRAINT "story_versions_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_audio_versions" ADD CONSTRAINT "story_audio_versions_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_events" ADD CONSTRAINT "play_events_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_events" ADD CONSTRAINT "play_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_beta_codes" ADD CONSTRAINT "user_beta_codes_code_id_fkey" FOREIGN KEY ("code_id") REFERENCES "beta_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_beta_codes" ADD CONSTRAINT "user_beta_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beta_feedback" ADD CONSTRAINT "beta_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beta_signups" ADD CONSTRAINT "beta_signups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_samples" ADD CONSTRAINT "voice_samples_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
