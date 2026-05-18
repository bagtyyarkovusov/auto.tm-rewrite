/*
  Warnings:

  - You are about to drop the column `url` on the `listing_media` table. All the data in the column will be lost.
  - Added the required column `key` to the `listing_media` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ListingCondition" AS ENUM ('new', 'used');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ListingStatus" ADD VALUE 'reported';
ALTER TYPE "ListingStatus" ADD VALUE 'banned';

-- AlterTable
ALTER TABLE "listing_media" DROP COLUMN "url",
ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "posterKey" TEXT,
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "allowCalls" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowChat" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "condition" "ListingCondition",
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "driveTypeId" TEXT,
ADD COLUMN     "enginePower" INTEGER,
ADD COLUMN     "engineTypeId" TEXT,
ADD COLUMN     "favoriteCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locationText" TEXT,
ADD COLUMN     "regionId" TEXT,
ADD COLUMN     "soldAt" TIMESTAMP(3),
ADD COLUMN     "transmissionId" TEXT,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vin" TEXT;

-- CreateTable
CREATE TABLE "listing_drafts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "fromCurrency" "Currency" NOT NULL,
    "toCurrency" "Currency" NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "setByUserId" TEXT,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listing_drafts_userId_updatedAt_idx" ON "listing_drafts"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_fromCurrency_toCurrency_key" ON "exchange_rates"("fromCurrency", "toCurrency");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_engineTypeId_fkey" FOREIGN KEY ("engineTypeId") REFERENCES "engine_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_transmissionId_fkey" FOREIGN KEY ("transmissionId") REFERENCES "transmissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_driveTypeId_fkey" FOREIGN KEY ("driveTypeId") REFERENCES "drive_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_drafts" ADD CONSTRAINT "listing_drafts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
