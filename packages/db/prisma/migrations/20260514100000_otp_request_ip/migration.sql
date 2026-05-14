ALTER TABLE "otp_requests" ADD COLUMN "ip" TEXT NOT NULL DEFAULT '127.0.0.1';

CREATE INDEX "otp_requests_ip_createdAt_idx" ON "otp_requests"("ip", "createdAt");
