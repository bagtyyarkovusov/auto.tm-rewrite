-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "acceptsExchange" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "installmentAvailable" BOOLEAN NOT NULL DEFAULT false;
