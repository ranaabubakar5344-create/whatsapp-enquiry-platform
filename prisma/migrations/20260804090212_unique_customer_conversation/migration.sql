/*
  Warnings:

  - A unique constraint covering the columns `[companyId,customerPhone]` on the table `Conversation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Conversation_companyId_customerPhone_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_companyId_customerPhone_key" ON "Conversation"("companyId", "customerPhone");
