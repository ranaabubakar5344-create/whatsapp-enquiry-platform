-- DropIndex
DROP INDEX "Lead_companyId_phone_key";

-- CreateIndex
CREATE INDEX "Lead_companyId_phone_idx" ON "Lead"("companyId", "phone");
