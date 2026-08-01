-- DropForeignKey
ALTER TABLE "Invite" DROP CONSTRAINT "Invite_familyGroupId_fkey";

-- DropForeignKey
ALTER TABLE "PersonNode" DROP CONSTRAINT "PersonNode_userId_fkey";

-- DropIndex
DROP INDEX "PersonNode_userId_key";

-- DropTable
DROP TABLE "Invite";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "InviteStatus";

-- DropEnum
DROP TYPE "UserRole";

-- DropEnum
DROP TYPE "MemberStatus";

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "FamilyGroup" ADD COLUMN     "adminAccountId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "readAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PersonNode" DROP COLUMN "pendingApproval",
DROP COLUMN "userId",
ADD COLUMN     "nikId" TEXT;

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "googleId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "refreshToken" TEXT,
    "activeNik" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NikIdentity" (
    "nik" TEXT NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "activeAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NikIdentity_pkey" PRIMARY KEY ("nik")
);

-- CreateTable
CREATE TABLE "NikLink" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NikLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "nikId" TEXT NOT NULL,
    "familyGroupId" TEXT NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "familyGroupId" TEXT NOT NULL,
    "actorAccountId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "familyGroupId" TEXT NOT NULL,
    "createdByAccountId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_googleId_key" ON "Account"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE INDEX "NikLink_nik_idx" ON "NikLink"("nik");

-- CreateIndex
CREATE INDEX "NikLink_accountId_idx" ON "NikLink"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "NikLink_accountId_nik_key" ON "NikLink"("accountId", "nik");

-- CreateIndex
CREATE INDEX "LeaveRequest_familyGroupId_idx" ON "LeaveRequest"("familyGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveRequest_nikId_familyGroupId_key" ON "LeaveRequest"("nikId", "familyGroupId");

-- CreateIndex
CREATE INDEX "AuditLog_familyGroupId_createdAt_idx" ON "AuditLog"("familyGroupId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShareToken_token_key" ON "ShareToken"("token");

-- CreateIndex
CREATE INDEX "ShareToken_token_idx" ON "ShareToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyGroup_adminAccountId_key" ON "FamilyGroup"("adminAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonNode_nikId_familyGroupId_key" ON "PersonNode"("nikId", "familyGroupId");

-- AddForeignKey
ALTER TABLE "NikLink" ADD CONSTRAINT "NikLink_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NikLink" ADD CONSTRAINT "NikLink_nik_fkey" FOREIGN KEY ("nik") REFERENCES "NikIdentity"("nik") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyGroup" ADD CONSTRAINT "FamilyGroup_adminAccountId_fkey" FOREIGN KEY ("adminAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonNode" ADD CONSTRAINT "PersonNode_nikId_fkey" FOREIGN KEY ("nikId") REFERENCES "NikIdentity"("nik") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_nikId_fkey" FOREIGN KEY ("nikId") REFERENCES "NikIdentity"("nik") ON DELETE CASCADE ON UPDATE CASCADE;
