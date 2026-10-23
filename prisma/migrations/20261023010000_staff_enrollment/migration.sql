CREATE TABLE "StaffEnrollment" (
 "id" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "usedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "StaffEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StaffEnrollment_tokenHash_key" ON "StaffEnrollment"("tokenHash");
CREATE INDEX "StaffEnrollment_userId_idx" ON "StaffEnrollment"("userId");
CREATE INDEX "StaffEnrollment_expiresAt_idx" ON "StaffEnrollment"("expiresAt");
ALTER TABLE "StaffEnrollment" ADD CONSTRAINT "StaffEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
