-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "aboutText" TEXT,
ADD COLUMN     "mapLat" DOUBLE PRECISION,
ADD COLUMN     "mapLng" DOUBLE PRECISION,
ADD COLUMN     "openingHours" JSONB,
ADD COLUMN     "socialLinks" JSONB,
ADD COLUMN     "whatsappNumber" TEXT;
