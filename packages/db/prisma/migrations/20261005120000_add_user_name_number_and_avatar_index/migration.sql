-- #638 / #353 identity design, items a and c. Every User gets a name number
-- (1000 to 9999, for the Generated Name "Driver 4821") and an index into the
-- 12 bundled car avatars, kept for the life of the account. Neither is unique.
-- avatarKey is the profile photo's object key, null until photos ship.
--
-- Written by hand: Prisma cannot express check constraints.
--
-- * Backfill in the same statement: the defaults are volatile, so PostgreSQL
--   evaluates them once per existing row while it adds the columns, and each
--   User gets its own values. That rewrites the table under one ACCESS
--   EXCLUSIVE lock held for this single statement only.
-- * The defaults stay, so an API instance from before this deploy can still
--   create Users. The API draws the values itself (GeneratedIdentity.ts) with
--   the same ranges.
-- * displayName and avatarUrl are not touched.
ALTER TABLE "users"
  ADD COLUMN "nameNumber" INTEGER NOT NULL DEFAULT (1000 + floor(random() * 9000))::integer,
  ADD COLUMN "avatarIndex" INTEGER NOT NULL DEFAULT (floor(random() * 12))::integer,
  ADD COLUMN "avatarKey" TEXT,
  ADD CONSTRAINT "users_nameNumber_range_check" CHECK ("nameNumber" BETWEEN 1000 AND 9999),
  ADD CONSTRAINT "users_avatarIndex_range_check" CHECK ("avatarIndex" BETWEEN 0 AND 11);
