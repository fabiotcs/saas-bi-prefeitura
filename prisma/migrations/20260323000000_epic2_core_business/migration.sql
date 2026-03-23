-- EPIC-2: Core Business — Secretarias, Ordens de Serviço e Auditoria
-- Migration: 20260323000000_epic2_core_business

-- ============================================
-- Enums
-- ============================================

CREATE TYPE "OrderStatus" AS ENUM (
  'DRAFT', 'OPEN', 'IN_QUOTATION', 'APPROVED', 'DELIVERED', 'COMPLETED', 'CANCELLED'
);

CREATE TYPE "OrderCategory" AS ENUM (
  'MATERIAL', 'SERVICE', 'EQUIPMENT'
);

CREATE TYPE "ChatSenderType" AS ENUM (
  'PREFECTURE', 'ESTABLISHMENT'
);

CREATE TYPE "TimelineStep" AS ENUM (
  'CREATED', 'QUOTATION_OPENED', 'QUOTATION_CLOSED', 'APPROVED', 'DELIVERED', 'COMPLETED', 'CANCELLED'
);

-- ============================================
-- Sequence para código de OS por ano
-- ============================================

CREATE SEQUENCE IF NOT EXISTS order_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_num   INT;
  code      TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  -- Reset anual: se o primeiro pedido do ano, reset a sequência
  SELECT COALESCE(MAX(CAST(SPLIT_PART(code, '-', 3) AS INT)), 0) + 1
    INTO seq_num
    FROM "Order"
   WHERE code LIKE 'OS-' || year_part || '-%';
  code := 'OS-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Table: Secretary
-- ============================================

CREATE TABLE "Secretary" (
  "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name"                TEXT NOT NULL,
  "phone"               TEXT NOT NULL,
  "cnpj"                TEXT NOT NULL,
  "description"         TEXT,
  "secretaryPersonName" TEXT NOT NULL,
  "photoUrl"            TEXT,
  "budgetAllocated"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "budgetUsed"          DOUBLE PRECISION NOT NULL DEFAULT 0,
  "parentId"            TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Secretary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Secretary_name_key" ON "Secretary"("name");
CREATE UNIQUE INDEX "Secretary_cnpj_key" ON "Secretary"("cnpj");
CREATE INDEX "Secretary_parentId_idx" ON "Secretary"("parentId");

ALTER TABLE "Secretary"
  ADD CONSTRAINT "Secretary_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Secretary"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- Table: Order
-- ============================================

CREATE TABLE "Order" (
  "id"                   TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "code"                 TEXT NOT NULL,
  "name"                 TEXT NOT NULL,
  "category"             "OrderCategory" NOT NULL,
  "status"               "OrderStatus" NOT NULL DEFAULT 'DRAFT',
  "secretaryId"          TEXT NOT NULL,
  "subSecretaryId"       TEXT,
  "investmentArea"       TEXT NOT NULL,
  "quotationStartDate"   TIMESTAMP(3),
  "quotationEndDate"     TIMESTAMP(3),
  "desiredDeliveryDate"  TIMESTAMP(3),
  "regionRadius"         INTEGER,
  "specificMunicipality" TEXT,
  "receiverName"         TEXT NOT NULL,
  "observations"         TEXT,
  "createdByUserId"      TEXT NOT NULL,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_code_key" ON "Order"("code");
CREATE INDEX "Order_secretaryId_idx" ON "Order"("secretaryId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_createdByUserId_idx" ON "Order"("createdByUserId");
CREATE INDEX "Order_code_idx" ON "Order"("code");

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_secretaryId_fkey"
  FOREIGN KEY ("secretaryId") REFERENCES "Secretary"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Order_subSecretaryId_fkey"
  FOREIGN KEY ("subSecretaryId") REFERENCES "Secretary"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Order_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- Table: OrderItem
-- ============================================

CREATE TABLE "OrderItem" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "orderId"        TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "imageUrl"       TEXT,
  "unit"           TEXT NOT NULL,
  "quantity"       DOUBLE PRECISION NOT NULL,
  "referenceValue" DOUBLE PRECISION NOT NULL,

  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Table: OrderTimeline
-- ============================================

CREATE TABLE "OrderTimeline" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "orderId"    TEXT NOT NULL,
  "step"       "TimelineStep" NOT NULL,
  "userId"     TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderTimeline_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderTimeline_orderId_idx" ON "OrderTimeline"("orderId");

ALTER TABLE "OrderTimeline"
  ADD CONSTRAINT "OrderTimeline_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "OrderTimeline_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- Table: DeliveryRecord
-- ============================================

CREATE TABLE "DeliveryRecord" (
  "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "orderId"           TEXT NOT NULL,
  "images"            TEXT[] NOT NULL DEFAULT '{}',
  "deliveredByUserId" TEXT,
  "receivedByUserId"  TEXT NOT NULL,
  "deliveredAt"       TIMESTAMP(3),
  "receivedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "observations"      TEXT,

  CONSTRAINT "DeliveryRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeliveryRecord_orderId_idx" ON "DeliveryRecord"("orderId");

ALTER TABLE "DeliveryRecord"
  ADD CONSTRAINT "DeliveryRecord_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DeliveryRecord_receivedByUserId_fkey"
  FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- Table: NonConformity
-- ============================================

CREATE TABLE "NonConformity" (
  "id"                 TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "orderId"            TEXT NOT NULL,
  "images"             TEXT[] NOT NULL DEFAULT '{}',
  "registeredByUserId" TEXT NOT NULL,
  "registeredAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "observations"       TEXT NOT NULL,

  CONSTRAINT "NonConformity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NonConformity_orderId_idx" ON "NonConformity"("orderId");

ALTER TABLE "NonConformity"
  ADD CONSTRAINT "NonConformity_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "NonConformity_registeredByUserId_fkey"
  FOREIGN KEY ("registeredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- Table: OrderInvoice
-- ============================================

CREATE TABLE "OrderInvoice" (
  "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "orderId"           TEXT NOT NULL,
  "fileUrl"           TEXT NOT NULL,
  "establishmentName" TEXT NOT NULL,
  "issuedAt"          TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrderInvoice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderInvoice_orderId_idx" ON "OrderInvoice"("orderId");

ALTER TABLE "OrderInvoice"
  ADD CONSTRAINT "OrderInvoice_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Table: ChatMessage
-- ============================================

CREATE TABLE "ChatMessage" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "orderId"    TEXT NOT NULL,
  "senderId"   TEXT NOT NULL,
  "content"    TEXT,
  "imageUrl"   TEXT,
  "senderType" "ChatSenderType" NOT NULL,
  "sentAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatMessage_orderId_idx" ON "ChatMessage"("orderId");
CREATE INDEX "ChatMessage_sentAt_idx" ON "ChatMessage"("sentAt");

ALTER TABLE "ChatMessage"
  ADD CONSTRAINT "ChatMessage_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ChatMessage_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- Table: DeliveryLocation
-- ============================================

CREATE TABLE "DeliveryLocation" (
  "id"      TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "orderId" TEXT NOT NULL,
  "name"    TEXT NOT NULL,
  "zipCode" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city"    TEXT NOT NULL,
  "state"   TEXT NOT NULL,

  CONSTRAINT "DeliveryLocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeliveryLocation_orderId_idx" ON "DeliveryLocation"("orderId");

ALTER TABLE "DeliveryLocation"
  ADD CONSTRAINT "DeliveryLocation_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Triggers de Auditoria Automática (Order, Secretary, User)
-- ============================================

CREATE OR REPLACE FUNCTION audit_order_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "AuditLog" (
    "id", "action", "urlPath", "userId", "userAgent", "ipAddress", "status", "metadata", "occurredAt"
  ) VALUES (
    gen_random_uuid()::TEXT,
    TG_OP || '_ORDER',
    '/api/orders/' || COALESCE(NEW."id", OLD."id"),
    COALESCE(NEW."createdByUserId", OLD."createdByUserId"),
    'system-trigger',
    '0.0.0.0',
    'SUCCESS'::"AuditStatus",
    jsonb_build_object(
      'orderId', COALESCE(NEW."id", OLD."id"),
      'code', COALESCE(NEW."code", OLD."code"),
      'status', COALESCE(NEW."status"::TEXT, OLD."status"::TEXT),
      'trigger', TRUE
    ),
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_audit_trigger
AFTER INSERT OR UPDATE ON "Order"
FOR EACH ROW EXECUTE FUNCTION audit_order_changes();

CREATE OR REPLACE FUNCTION audit_secretary_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "AuditLog" (
    "id", "action", "urlPath", "userId", "userAgent", "ipAddress", "status", "metadata", "occurredAt"
  ) VALUES (
    gen_random_uuid()::TEXT,
    TG_OP || '_SECRETARY',
    '/api/secretaries/' || COALESCE(NEW."id", OLD."id"),
    NULL,
    'system-trigger',
    '0.0.0.0',
    'SUCCESS'::"AuditStatus",
    jsonb_build_object(
      'secretaryId', COALESCE(NEW."id", OLD."id"),
      'name', COALESCE(NEW."name", OLD."name"),
      'trigger', TRUE
    ),
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER secretary_audit_trigger
AFTER INSERT OR UPDATE ON "Secretary"
FOR EACH ROW EXECUTE FUNCTION audit_secretary_changes();

-- Trigger para User já existe da migration anterior (Story 1.3)
-- Adicionar coluna para registrar mudanças de role/status

-- ============================================
-- Imutabilidade: Order não pode ter UPDATE em campos críticos após APPROVED
-- ============================================

CREATE OR REPLACE FUNCTION prevent_approved_order_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" IN ('APPROVED', 'DELIVERED', 'COMPLETED') THEN
    IF NEW."name" <> OLD."name"
       OR NEW."category" <> OLD."category"
       OR NEW."secretaryId" <> OLD."secretaryId" THEN
      RAISE EXCEPTION 'Cannot modify approved order fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_approved_order_mutation_trigger
BEFORE UPDATE ON "Order"
FOR EACH ROW EXECUTE FUNCTION prevent_approved_order_mutation();
