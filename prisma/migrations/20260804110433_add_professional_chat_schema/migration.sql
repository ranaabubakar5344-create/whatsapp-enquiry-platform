/*
  Warnings:

  - The values [HUMAN_HANDOVER] on the enum `BotStep` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[conversationId,clientMessageId]` on the table `Message` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AgentAvailability" AS ENUM ('OFFLINE', 'AVAILABLE', 'BUSY', 'AWAY');

-- CreateEnum
CREATE TYPE "MessagingMode" AS ENUM ('FREE_MODE', 'WHATSAPP_API', 'HYBRID');

-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('WEBSITE', 'WHATSAPP_API', 'WHATSAPP_HANDOFF');

-- CreateEnum
CREATE TYPE "WidgetPosition" AS ENUM ('BOTTOM_RIGHT', 'BOTTOM_LEFT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_CHAT', 'NEW_MESSAGE', 'HANDOFF_REQUESTED', 'CHAT_ASSIGNED', 'FOLLOW_UP_DUE', 'SYSTEM');

-- AlterEnum
BEGIN;
CREATE TYPE "BotStep_new" AS ENUM ('WELCOME', 'LANGUAGE', 'CONSENT', 'MAIN_MENU', 'ASK_NAME', 'ASK_PHONE', 'ASK_EMAIL', 'ASK_COURSE', 'ASK_COUNTRY', 'FAQ', 'COMPLETED', 'HUMAN_HANDOFF', 'WAITING_FOR_AGENT', 'AGENT_CONNECTED');
ALTER TABLE "public"."Conversation" ALTER COLUMN "currentStep" DROP DEFAULT;
ALTER TABLE "Conversation" ALTER COLUMN "currentStep" TYPE "BotStep_new"
USING (
    CASE
        WHEN "currentStep"::text = 'HUMAN_HANDOVER' THEN 'HUMAN_HANDOFF'
        ELSE "currentStep"::text
    END
)::"BotStep_new";
ALTER TYPE "BotStep" RENAME TO "BotStep_old";
ALTER TYPE "BotStep_new" RENAME TO "BotStep";
DROP TYPE "public"."BotStep_old";
ALTER TABLE "Conversation" ALTER COLUMN "currentStep" SET DEFAULT 'WELCOME';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConversationStatus" ADD VALUE 'RESOLVED';
ALTER TYPE "ConversationStatus" ADD VALUE 'SPAM';

-- AlterEnum
ALTER TYPE "MessageStatus" ADD VALUE 'PENDING';

-- DropIndex
DROP INDEX "Conversation_companyId_status_idx";

-- DropIndex
DROP INDEX "User_role_idx";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "messagingMode" "MessagingMode" NOT NULL DEFAULT 'FREE_MODE';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "agentLastReadAt" TIMESTAMP(3),
ADD COLUMN     "channel" "ConversationChannel" NOT NULL DEFAULT 'WHATSAPP_API',
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "firstAgentReplyAt" TIMESTAMP(3),
ADD COLUMN     "handoffRequestedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "sourcePageUrl" TEXT,
ADD COLUMN     "visitorLastReadAt" TIMESTAMP(3),
ADD COLUMN     "websiteVisitorId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "whatsappHandoffAt" TIMESTAMP(3),
ALTER COLUMN "source" SET DEFAULT 'Website Chat';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "clientMessageId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "senderUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "availability" "AgentAvailability" NOT NULL DEFAULT 'OFFLINE',
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "maxActiveChats" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "WebsiteVisitor" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "firstPageUrl" TEXT,
    "lastPageUrl" TEXT,
    "referrer" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "userAgent" TEXT,
    "ipHash" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "displayName" TEXT,
    "subtitle" TEXT,
    "launcherText" TEXT NOT NULL DEFAULT 'Chat with us',
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Hello! How can we help you today?',
    "offlineMessage" TEXT NOT NULL DEFAULT 'Our team is currently offline. Please leave your details.',
    "humanHandoffMessage" TEXT NOT NULL DEFAULT 'Your chat has been transferred to a Marketing Executive.',
    "consentText" TEXT NOT NULL DEFAULT 'I agree to share my details for enquiry support.',
    "primaryColor" TEXT NOT NULL DEFAULT '#25D366',
    "position" "WidgetPosition" NOT NULL DEFAULT 'BOTTOM_RIGHT',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "enableArabic" BOOLEAN NOT NULL DEFAULT false,
    "collectName" BOOLEAN NOT NULL DEFAULT true,
    "collectPhone" BOOLEAN NOT NULL DEFAULT true,
    "collectEmail" BOOLEAN NOT NULL DEFAULT true,
    "requireConsent" BOOLEAN NOT NULL DEFAULT true,
    "humanHandoffEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappHandoffEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappHandoffNumber" TEXT,
    "showOnlineStatus" BOOLEAN NOT NULL DEFAULT true,
    "showAgentAvatars" BOOLEAN NOT NULL DEFAULT true,
    "enableSound" BOOLEAN NOT NULL DEFAULT true,
    "autoOpenDelaySeconds" INTEGER NOT NULL DEFAULT 0,
    "privacyPolicyUrl" TEXT,
    "businessHours" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetDomain" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotFaq" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "category" TEXT,
    "keywords" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotFaq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentMember" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CannedReply" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "shortcut" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CannedReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748B',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationTag" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationNote" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteVisitor_sessionTokenHash_key" ON "WebsiteVisitor"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "WebsiteVisitor_companyId_lastSeenAt_idx" ON "WebsiteVisitor"("companyId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "WebsiteVisitor_companyId_createdAt_idx" ON "WebsiteVisitor"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetSettings_companyId_key" ON "WidgetSettings"("companyId");

-- CreateIndex
CREATE INDEX "WidgetDomain_companyId_isActive_idx" ON "WidgetDomain"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetDomain_companyId_domain_key" ON "WidgetDomain"("companyId", "domain");

-- CreateIndex
CREATE INDEX "BotFaq_companyId_language_isActive_idx" ON "BotFaq"("companyId", "language", "isActive");

-- CreateIndex
CREATE INDEX "BotFaq_companyId_sortOrder_idx" ON "BotFaq"("companyId", "sortOrder");

-- CreateIndex
CREATE INDEX "Department_companyId_isActive_idx" ON "Department"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Department_companyId_name_key" ON "Department"("companyId", "name");

-- CreateIndex
CREATE INDEX "DepartmentMember_companyId_isActive_idx" ON "DepartmentMember"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "DepartmentMember_userId_idx" ON "DepartmentMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentMember_departmentId_userId_key" ON "DepartmentMember"("departmentId", "userId");

-- CreateIndex
CREATE INDEX "CannedReply_companyId_isActive_idx" ON "CannedReply"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "CannedReply_companyId_language_idx" ON "CannedReply"("companyId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "CannedReply_companyId_title_key" ON "CannedReply"("companyId", "title");

-- CreateIndex
CREATE INDEX "Tag_companyId_idx" ON "Tag"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_companyId_name_key" ON "Tag"("companyId", "name");

-- CreateIndex
CREATE INDEX "ConversationTag_companyId_idx" ON "ConversationTag"("companyId");

-- CreateIndex
CREATE INDEX "ConversationTag_tagId_idx" ON "ConversationTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationTag_conversationId_tagId_key" ON "ConversationTag"("conversationId", "tagId");

-- CreateIndex
CREATE INDEX "ConversationNote_companyId_createdAt_idx" ON "ConversationNote"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationNote_conversationId_createdAt_idx" ON "ConversationNote"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationNote_authorId_idx" ON "ConversationNote"("authorId");

-- CreateIndex
CREATE INDEX "Notification_companyId_createdAt_idx" ON "Notification"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_conversationId_idx" ON "Notification"("conversationId");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Company_isActive_idx" ON "Company"("isActive");

-- CreateIndex
CREATE INDEX "Company_messagingMode_idx" ON "Company"("messagingMode");

-- CreateIndex
CREATE INDEX "Conversation_companyId_channel_status_idx" ON "Conversation"("companyId", "channel", "status");

-- CreateIndex
CREATE INDEX "Conversation_departmentId_idx" ON "Conversation"("departmentId");

-- CreateIndex
CREATE INDEX "Conversation_websiteVisitorId_idx" ON "Conversation"("websiteVisitorId");

-- CreateIndex
CREATE INDEX "Lead_companyId_priority_idx" ON "Lead"("companyId", "priority");

-- CreateIndex
CREATE INDEX "Message_senderUserId_idx" ON "Message"("senderUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_conversationId_clientMessageId_key" ON "Message"("conversationId", "clientMessageId");

-- CreateIndex
CREATE INDEX "User_companyId_role_idx" ON "User"("companyId", "role");

-- CreateIndex
CREATE INDEX "User_companyId_isActive_idx" ON "User"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "User_companyId_availability_idx" ON "User"("companyId", "availability");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_websiteVisitorId_fkey" FOREIGN KEY ("websiteVisitorId") REFERENCES "WebsiteVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteVisitor" ADD CONSTRAINT "WebsiteVisitor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetSettings" ADD CONSTRAINT "WidgetSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetDomain" ADD CONSTRAINT "WidgetDomain_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotFaq" ADD CONSTRAINT "BotFaq_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentMember" ADD CONSTRAINT "DepartmentMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentMember" ADD CONSTRAINT "DepartmentMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentMember" ADD CONSTRAINT "DepartmentMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CannedReply" ADD CONSTRAINT "CannedReply_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationTag" ADD CONSTRAINT "ConversationTag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationTag" ADD CONSTRAINT "ConversationTag_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationTag" ADD CONSTRAINT "ConversationTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationNote" ADD CONSTRAINT "ConversationNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationNote" ADD CONSTRAINT "ConversationNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationNote" ADD CONSTRAINT "ConversationNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
