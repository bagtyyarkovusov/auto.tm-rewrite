-- #592 / ADR-0081: Verified Contact Phones, owned by Listings.
-- Generated with `prisma migrate diff` (schema to schema).

-- CreateTable
CREATE TABLE "verified_contact_phones" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verified_contact_phones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verified_contact_phones_sellerId_phone_key" ON "verified_contact_phones"("sellerId", "phone");

-- AddForeignKey
ALTER TABLE "verified_contact_phones" ADD CONSTRAINT "verified_contact_phones_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

