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

-- CreateIndex
CREATE UNIQUE INDEX "beta_codes_code_key" ON "beta_codes"("code");

-- CreateIndex
CREATE INDEX "user_beta_codes_user_id_idx" ON "user_beta_codes"("user_id");

-- CreateIndex
CREATE INDEX "user_beta_codes_code_id_idx" ON "user_beta_codes"("code_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_beta_codes_user_id_code_id_key" ON "user_beta_codes"("user_id", "code_id");

-- AddForeignKey
ALTER TABLE "user_beta_codes" ADD CONSTRAINT "user_beta_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_beta_codes" ADD CONSTRAINT "user_beta_codes_code_id_fkey" FOREIGN KEY ("code_id") REFERENCES "beta_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
