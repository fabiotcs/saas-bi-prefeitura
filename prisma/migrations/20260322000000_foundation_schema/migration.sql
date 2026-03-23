-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MAIN_MANAGER', 'SECRETARY_MANAGER', 'SECRETARY_USER', 'AUDIT_VIEWER');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAILED', 'SUSPICIOUS');

-- CreateEnum
CREATE TYPE "FraudAlertLevel" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "BiometricStatus" AS ENUM ('SUCCESS', 'FAILED', 'SUSPICIOUS');

-- CreateEnum
CREATE TYPE "TwoFactorAction" AS ENUM ('APPROVE_ORDER', 'SUBMIT_COMMITMENT', 'SUBMIT_ADDITIVE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "rg" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "secretaryId" TEXT,
    "photoUrl" TEXT,
    "lastLogin" TIMESTAMP(3),
    "biometricVerified" BOOLEAN NOT NULL DEFAULT false,
    "documentVerified" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "TwoFactorAction" NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactorRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "urlPath" TEXT NOT NULL,
    "userId" TEXT,
    "userAgent" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "status" "AuditStatus" NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capturedImageUrl" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "livenessScore" DOUBLE PRECISION NOT NULL,
    "confidenceLevel" DOUBLE PRECISION NOT NULL,
    "fraudAlertLevel" "FraudAlertLevel" NOT NULL,
    "aiEstimatedAge" INTEGER,
    "ipAddress" TEXT NOT NULL,
    "status" "BiometricStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_status_idx" ON "AuditLog"("status");

-- CreateIndex
CREATE INDEX "AuditLog_occurredAt_idx" ON "AuditLog"("occurredAt");

-- CreateIndex
CREATE INDEX "BiometricRecord_userId_idx" ON "BiometricRecord"("userId");

-- CreateIndex
CREATE INDEX "BiometricRecord_status_idx" ON "BiometricRecord"("status");

-- CreateIndex
CREATE INDEX "BiometricRecord_createdAt_idx" ON "BiometricRecord"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorRequest" ADD CONSTRAINT "TwoFactorRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricRecord" ADD CONSTRAINT "BiometricRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Immutability trigger for audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs records are immutable. DELETE and UPDATE are forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- Immutability trigger for biometric_records
CREATE OR REPLACE FUNCTION prevent_biometric_record_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'biometric_records records are immutable. DELETE and UPDATE are forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER biometric_records_immutable
BEFORE UPDATE OR DELETE ON "BiometricRecord"
FOR EACH ROW EXECUTE FUNCTION prevent_biometric_record_modification();
