-- ADR-0054: bind each Sign-in Code to one channel and normalized destination.
-- Keep `phone` for one rollout so the previous API revision can overlap safely.
CREATE TYPE "SignInCodeChannel" AS ENUM ('phone', 'email');

ALTER TABLE "otp_requests"
    ADD COLUMN "channel" "SignInCodeChannel",
    ADD COLUMN "destination" TEXT,
    ALTER COLUMN "phone" DROP NOT NULL;

-- Every existing request used the phone channel.
UPDATE "otp_requests"
SET "channel" = 'phone', "destination" = "phone";

ALTER TABLE "otp_requests"
    ALTER COLUMN "channel" SET NOT NULL,
    ALTER COLUMN "destination" SET NOT NULL;

-- During the deploy overlap, fill the new columns for old writers and the
-- compatibility phone column for new phone writes.
CREATE FUNCTION "otp_requests_fill_compat_columns"()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."channel" IS NULL
       AND NEW."destination" IS NULL
       AND NEW."phone" IS NOT NULL THEN
        NEW."channel" := 'phone';
        NEW."destination" := NEW."phone";
    ELSIF NEW."channel" = 'phone'
       AND NEW."destination" IS NOT NULL
       AND NEW."phone" IS NULL THEN
        NEW."phone" := NEW."destination";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "otp_requests_fill_compat_columns_trigger"
BEFORE INSERT ON "otp_requests"
FOR EACH ROW
EXECUTE FUNCTION "otp_requests_fill_compat_columns"();

ALTER TABLE "otp_requests"
    ADD CONSTRAINT "otp_requests_phone_compat_check"
    CHECK (
        ("channel" = 'phone' AND "phone" = "destination")
        OR ("channel" = 'email' AND "phone" IS NULL)
    );

CREATE INDEX "otp_requests_channel_destination_createdAt_idx"
    ON "otp_requests"("channel", "destination", "createdAt");
