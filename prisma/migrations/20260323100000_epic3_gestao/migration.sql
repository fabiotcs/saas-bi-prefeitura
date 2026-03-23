-- EPIC-3: Gestão — Estoque, Financeiro e Orçamento
-- Migration: 20260323100000_epic3_gestao

-- ============================================
-- Enums
-- ============================================

CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'TRANSFER');
CREATE TYPE "AbcClass" AS ENUM ('A', 'B', 'C');
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');
CREATE TYPE "BudgetCommitmentStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'CANCELLED');

-- ============================================
-- Table: StorageLocation
-- ============================================

CREATE TABLE "StorageLocation" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name"         TEXT NOT NULL,
  "secretaryId"  TEXT,
  "observations" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StorageLocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StorageLocation_secretaryId_idx" ON "StorageLocation"("secretaryId");

ALTER TABLE "StorageLocation"
  ADD CONSTRAINT "StorageLocation_secretaryId_fkey"
  FOREIGN KEY ("secretaryId") REFERENCES "Secretary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- Table: StockItem
-- ============================================

CREATE TABLE "StockItem" (
  "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name"              TEXT NOT NULL,
  "imageUrl"          TEXT,
  "quantity"          DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unit"              TEXT NOT NULL,
  "unitPrice"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "minimumAlert"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "barcode"           TEXT,
  "qrCode"            TEXT,
  "storageLocationId" TEXT,
  "abcClass"          "AbcClass",
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockItem_storageLocationId_idx" ON "StockItem"("storageLocationId");
CREATE INDEX "StockItem_abcClass_idx" ON "StockItem"("abcClass");

ALTER TABLE "StockItem"
  ADD CONSTRAINT "StockItem_storageLocationId_fkey"
  FOREIGN KEY ("storageLocationId") REFERENCES "StorageLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- Table: StockMovement
-- ============================================

CREATE TABLE "StockMovement" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "type"             "StockMovementType" NOT NULL,
  "itemId"           TEXT NOT NULL,
  "quantity"         DOUBLE PRECISION NOT NULL,
  "value"            DOUBLE PRECISION NOT NULL,
  "userId"           TEXT NOT NULL,
  "targetLocationId" TEXT,
  "notes"            TEXT,
  "occurredAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockMovement_itemId_idx" ON "StockMovement"("itemId");
CREATE INDEX "StockMovement_userId_idx" ON "StockMovement"("userId");
CREATE INDEX "StockMovement_occurredAt_idx" ON "StockMovement"("occurredAt");

ALTER TABLE "StockMovement"
  ADD CONSTRAINT "StockMovement_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "StockMovement_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- Table: Invoice
-- ============================================

CREATE TABLE "Invoice" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "secretaryId"     TEXT NOT NULL,
  "subSecretaryId"  TEXT,
  "periodStart"     TIMESTAMP(3) NOT NULL,
  "periodEnd"       TIMESTAMP(3) NOT NULL,
  "totalBilled"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalNet"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalPaid"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status"          "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "paymentProofUrl" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Invoice_secretaryId_idx" ON "Invoice"("secretaryId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_secretaryId_fkey"
  FOREIGN KEY ("secretaryId") REFERENCES "Secretary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- Table: InvoiceItem
-- ============================================

CREATE TABLE "InvoiceItem" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "invoiceId" TEXT NOT NULL,
  "orderId"   TEXT,
  "itemName"  TEXT NOT NULL,
  "quantity"  DOUBLE PRECISION NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "total"     DOUBLE PRECISION NOT NULL,

  CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

ALTER TABLE "InvoiceItem"
  ADD CONSTRAINT "InvoiceItem_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Table: PaymentHistory
-- ============================================

CREATE TABLE "PaymentHistory" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "invoiceId" TEXT NOT NULL,
  "amount"    DOUBLE PRECISION NOT NULL,
  "paidAt"    TIMESTAMP(3) NOT NULL,
  "proofUrl"  TEXT,

  CONSTRAINT "PaymentHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentHistory_invoiceId_idx" ON "PaymentHistory"("invoiceId");

ALTER TABLE "PaymentHistory"
  ADD CONSTRAINT "PaymentHistory_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Table: BudgetContract
-- ============================================

CREATE TABLE "BudgetContract" (
  "id"                       TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "contractNumber"           TEXT NOT NULL,
  "initialValue"             DOUBLE PRECISION NOT NULL,
  "additivesTotal"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currentTotal"             DOUBLE PRECISION NOT NULL,
  "distributedToSecretaries" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "allocatedViaCommitment"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "consumedInOrders"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BudgetContract_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BudgetContract_contractNumber_key" ON "BudgetContract"("contractNumber");

-- ============================================
-- Table: BudgetAdditive
-- ============================================

CREATE TABLE "BudgetAdditive" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "contractId"   TEXT NOT NULL,
  "value"        DOUBLE PRECISION NOT NULL,
  "description"  TEXT NOT NULL,
  "approvedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fileUrl"      TEXT,
  "approvedById" TEXT NOT NULL,

  CONSTRAINT "BudgetAdditive_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BudgetAdditive_contractId_idx" ON "BudgetAdditive"("contractId");

ALTER TABLE "BudgetAdditive"
  ADD CONSTRAINT "BudgetAdditive_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "BudgetContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "BudgetAdditive_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- Table: BudgetCommitment
-- ============================================

CREATE TABLE "BudgetCommitment" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "contractId"     TEXT NOT NULL,
  "secretaryId"    TEXT NOT NULL,
  "value"          DOUBLE PRECISION NOT NULL,
  "usedValue"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status"         "BudgetCommitmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "registeredAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fileUrl"        TEXT,
  "registeredById" TEXT NOT NULL,

  CONSTRAINT "BudgetCommitment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BudgetCommitment_contractId_idx" ON "BudgetCommitment"("contractId");
CREATE INDEX "BudgetCommitment_secretaryId_idx" ON "BudgetCommitment"("secretaryId");

ALTER TABLE "BudgetCommitment"
  ADD CONSTRAINT "BudgetCommitment_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "BudgetContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "BudgetCommitment_secretaryId_fkey"
  FOREIGN KEY ("secretaryId") REFERENCES "Secretary"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "BudgetCommitment_registeredById_fkey"
  FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- Trigger auditoria para StockMovement (imutável)
-- ============================================

CREATE OR REPLACE FUNCTION prevent_stock_movement_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Stock movements are immutable — register a new movement to correct';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_stock_movement_update_trigger
BEFORE UPDATE OR DELETE ON "StockMovement"
FOR EACH ROW EXECUTE FUNCTION prevent_stock_movement_update();
