-- ADR-0054: phone and email are optional, unique, always-verified Sign-in Methods on User.
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "users"
    ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3),
    ADD COLUMN "email" TEXT,
    ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Every existing User signed in with a phone code, so their phone is verified since creation.
UPDATE "users" SET "phoneVerifiedAt" = "createdAt" WHERE "phone" IS NOT NULL;

-- Free phones held by the old day-30 purge tombstone (`deleted:<id>`); the purge now nulls them.
UPDATE "users" SET "phone" = NULL, "phoneVerifiedAt" = NULL WHERE "phone" LIKE 'deleted:%';

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- A stored value always has a verified-at time, and a verified-at time always has a value.
ALTER TABLE "users" ADD CONSTRAINT "users_phone_verified_check" CHECK (("phone" IS NULL) = ("phoneVerifiedAt" IS NULL));
ALTER TABLE "users" ADD CONSTRAINT "users_email_verified_check" CHECK (("email" IS NULL) = ("emailVerifiedAt" IS NULL));
