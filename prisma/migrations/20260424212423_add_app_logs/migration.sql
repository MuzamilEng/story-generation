-- CreateTable
CREATE TABLE "app_logs" (
    "id" TEXT NOT NULL,
    "level" VARCHAR(10) NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_logs_level_idx" ON "app_logs"("level");

-- CreateIndex
CREATE INDEX "app_logs_source_idx" ON "app_logs"("source");

-- CreateIndex
CREATE INDEX "app_logs_user_id_idx" ON "app_logs"("user_id");

-- CreateIndex
CREATE INDEX "app_logs_created_at_idx" ON "app_logs"("created_at");
