-- AlterTable
ALTER TABLE "PersonNode" ADD COLUMN     "pendingApproval" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referrerNik" TEXT;
