-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "whatsappAccessTokenEncrypted" TEXT,
ADD COLUMN     "whatsappAppSecretEncrypted" TEXT,
ADD COLUMN     "whatsappConfiguredAt" TIMESTAMP(3),
ADD COLUMN     "whatsappVerifyTokenHash" TEXT,
ADD COLUMN     "whatsappWebhookVerifiedAt" TIMESTAMP(3);
