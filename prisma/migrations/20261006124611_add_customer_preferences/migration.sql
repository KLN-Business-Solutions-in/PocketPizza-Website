-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "whatsappOrderUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "whatsappStatusUpdates" BOOLEAN NOT NULL DEFAULT true;
