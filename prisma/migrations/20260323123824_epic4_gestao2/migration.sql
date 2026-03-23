-- CreateEnum
CREATE TYPE "EstablishmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('CENTRALIZED', 'DECENTRALIZED');

-- AlterTable
ALTER TABLE "BudgetAdditive" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "BudgetCommitment" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "BudgetContract" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ChatMessage" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DeliveryLocation" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DeliveryRecord" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "images" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InvoiceItem" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "NonConformity" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "images" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrderInvoice" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrderTimeline" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PaymentHistory" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Secretary" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StockItem" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StockMovement" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StorageLocation" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "BrandConfig" (
    "id" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#1E40AF',
    "secondaryColor" TEXT NOT NULL DEFAULT '#1E3A8A',
    "faviconUrl" TEXT NOT NULL,
    "municipalityName" TEXT NOT NULL DEFAULT 'Prefeitura Municipal de Araçuaí',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Establishment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "servicesDescription" TEXT NOT NULL,
    "ordersCompleted" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "EstablishmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Establishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstablishmentFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstablishmentFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'system',
    "billingMode" "BillingMode" NOT NULL DEFAULT 'CENTRALIZED',
    "billingClosingDay" INTEGER NOT NULL DEFAULT 25,
    "requireManagerApproval" BOOLEAN NOT NULL DEFAULT true,
    "requireBudgetValidation" BOOLEAN NOT NULL DEFAULT true,
    "minimumProposalsForApproval" INTEGER NOT NULL DEFAULT 3,
    "restrictOrderCreationToVerifiedUsers" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "permissions" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCallLog" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,

    CONSTRAINT "ApiCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Establishment_cnpj_key" ON "Establishment"("cnpj");

-- CreateIndex
CREATE INDEX "Establishment_status_idx" ON "Establishment"("status");

-- CreateIndex
CREATE INDEX "Establishment_cnpj_idx" ON "Establishment"("cnpj");

-- CreateIndex
CREATE INDEX "EstablishmentFavorite_userId_idx" ON "EstablishmentFavorite"("userId");

-- CreateIndex
CREATE INDEX "EstablishmentFavorite_establishmentId_idx" ON "EstablishmentFavorite"("establishmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EstablishmentFavorite_userId_establishmentId_key" ON "EstablishmentFavorite"("userId", "establishmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_createdById_idx" ON "ApiKey"("createdById");

-- CreateIndex
CREATE INDEX "ApiKey_revoked_idx" ON "ApiKey"("revoked");

-- CreateIndex
CREATE INDEX "ApiCallLog_apiKeyId_idx" ON "ApiCallLog"("apiKeyId");

-- CreateIndex
CREATE INDEX "ApiCallLog_occurredAt_idx" ON "ApiCallLog"("occurredAt");

-- AddForeignKey
ALTER TABLE "EstablishmentFavorite" ADD CONSTRAINT "EstablishmentFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstablishmentFavorite" ADD CONSTRAINT "EstablishmentFavorite_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCallLog" ADD CONSTRAINT "ApiCallLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
