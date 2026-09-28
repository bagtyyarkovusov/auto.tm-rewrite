-- PostgreSQL assigns sequence values to existing rows as it adds the column.
ALTER TABLE "listings" ADD COLUMN "publicNumber" SERIAL NOT NULL;

CREATE UNIQUE INDEX "listings_publicNumber_key" ON "listings"("publicNumber");
