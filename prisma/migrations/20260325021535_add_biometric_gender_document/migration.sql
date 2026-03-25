-- AlterTable
ALTER TABLE "BiometricRecord" ADD COLUMN     "aiEstimatedGender" TEXT,
ADD COLUMN     "documentMatch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "documentPhotoUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "documentPhotoUrl" TEXT;
