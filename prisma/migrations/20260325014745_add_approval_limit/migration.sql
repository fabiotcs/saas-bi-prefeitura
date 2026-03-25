-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approvalLimit" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "User_secretaryId_idx" ON "User"("secretaryId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_secretaryId_fkey" FOREIGN KEY ("secretaryId") REFERENCES "Secretary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
