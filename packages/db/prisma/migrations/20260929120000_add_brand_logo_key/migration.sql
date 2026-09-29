-- Brand logo (issue #364): object key in the catalog-assets bucket; null shows a letter fallback.
ALTER TABLE "brands" ADD COLUMN "logoKey" TEXT;
