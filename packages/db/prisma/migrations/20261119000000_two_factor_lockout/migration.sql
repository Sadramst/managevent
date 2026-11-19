-- Better Auth 1.7 two-factor verification state and brute-force lockout columns.
ALTER TABLE "TwoFactor"
  ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "failedVerificationCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMP(3);
