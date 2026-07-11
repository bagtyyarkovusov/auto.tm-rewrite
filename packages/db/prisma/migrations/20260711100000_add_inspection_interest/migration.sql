-- CreateInspectionInterest fake-door demand table
CREATE TABLE "inspection_interests" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "requester_user_id" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "willingness_to_pay_tmt" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_interests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inspection_interests_listing_id_requester_user_id_key" ON "inspection_interests"("listing_id", "requester_user_id");

-- CreateIndex
CREATE INDEX "inspection_interests_listing_id_created_at_idx" ON "inspection_interests"("listing_id", "created_at");

-- CreateIndex
CREATE INDEX "inspection_interests_requester_user_id_created_at_idx" ON "inspection_interests"("requester_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "inspection_interests" ADD CONSTRAINT "inspection_interests_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_interests" ADD CONSTRAINT "inspection_interests_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
