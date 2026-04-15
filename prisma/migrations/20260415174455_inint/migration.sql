/*
  Warnings:

  - You are about to drop the column `member_number` on the `waitlist_entries` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `waitlist_entries` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "waitlist_entries_member_number_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "feedback_state" VARCHAR(30) NOT NULL DEFAULT 'pending_early';

-- AlterTable
ALTER TABLE "waitlist_entries" DROP COLUMN "member_number",
DROP COLUMN "source";

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

-- AddForeignKey
ALTER TABLE "beta_signups" ADD CONSTRAINT "beta_signups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
