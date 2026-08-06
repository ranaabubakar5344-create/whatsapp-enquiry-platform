-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'AGENT');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'FOLLOW_UP', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('BOT_ACTIVE', 'WAITING_FOR_AGENT', 'AGENT_ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "BotStep" AS ENUM ('WELCOME', 'LANGUAGE', 'MAIN_MENU', 'ASK_NAME', 'ASK_EMAIL', 'ASK_COURSE', 'ASK_COUNTRY', 'COMPLETED', 'HUMAN_HANDOVER');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('CUSTOMER', 'BOT', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO', 'LOCATION', 'INTERACTIVE');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('RECEIVED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#25D366',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dubai',
    "whatsappNumber" TEXT,
    "whatsappPhoneNumberId" TEXT,
    "whatsappBusinessAccountId" TEXT,
    "widgetKey" TEXT NOT NULL,
    "botEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AGENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Programme" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "fee" TEXT,
    "duration" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "programmeId" TEXT,
    "assignedToId" TEXT,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "country" TEXT,
    "courseInterested" TEXT,
    "source" TEXT NOT NULL DEFAULT 'Website WhatsApp',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM',
    "remarks" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leadId" TEXT,
    "assignedToId" TEXT,
    "customerPhone" TEXT NOT NULL,
    "customerName" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" "ConversationStatus" NOT NULL DEFAULT 'BOT_ACTIVE',
    "currentStep" "BotStep" NOT NULL DEFAULT 'WELCOME',
    "botActive" BOOLEAN NOT NULL DEFAULT true,
    "contextData" JSONB,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "whatsappMessageId" TEXT,
    "direction" "MessageDirection" NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'RECEIVED',
    "errorMessage" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Company_whatsappPhoneNumberId_key" ON "Company"("whatsappPhoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_widgetKey_key" ON "Company"("widgetKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Programme_companyId_idx" ON "Programme"("companyId");

-- CreateIndex
CREATE INDEX "Programme_companyId_isActive_idx" ON "Programme"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Programme_companyId_slug_key" ON "Programme"("companyId", "slug");

-- CreateIndex
CREATE INDEX "Lead_companyId_status_idx" ON "Lead"("companyId", "status");

-- CreateIndex
CREATE INDEX "Lead_companyId_createdAt_idx" ON "Lead"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_programmeId_idx" ON "Lead"("programmeId");

-- CreateIndex
CREATE INDEX "Lead_assignedToId_idx" ON "Lead"("assignedToId");

-- CreateIndex
CREATE INDEX "Lead_followUpDate_idx" ON "Lead"("followUpDate");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_companyId_phone_key" ON "Lead"("companyId", "phone");

-- CreateIndex
CREATE INDEX "Conversation_companyId_customerPhone_idx" ON "Conversation"("companyId", "customerPhone");

-- CreateIndex
CREATE INDEX "Conversation_companyId_status_idx" ON "Conversation"("companyId", "status");

-- CreateIndex
CREATE INDEX "Conversation_companyId_lastMessageAt_idx" ON "Conversation"("companyId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_leadId_idx" ON "Conversation"("leadId");

-- CreateIndex
CREATE INDEX "Conversation_assignedToId_idx" ON "Conversation"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_whatsappMessageId_key" ON "Message"("whatsappMessageId");

-- CreateIndex
CREATE INDEX "Message_companyId_createdAt_idx" ON "Message"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_status_idx" ON "Message"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
