ALTER TABLE "media_uploads"
  ADD COLUMN "writeProtocol" TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN "objectKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "media_uploads" ADD CONSTRAINT "media_uploads_write_protocol_check"
  CHECK ("writeProtocol" IN ('legacy', 'conditional-v1'));
ALTER TABLE "media_uploads" ADD CONSTRAINT "media_uploads_conditional_manifest_check"
  CHECK ("writeProtocol" = 'legacy' OR
    ("kind" = 'image' AND cardinality("objectKeys") = 9 AND "key" = ANY("objectKeys")));
