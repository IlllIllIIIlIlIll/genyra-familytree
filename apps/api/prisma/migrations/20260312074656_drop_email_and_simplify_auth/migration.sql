/*
  Warnings:

  - You are about to drop the column `birthDate` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `birthPlace` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `displayName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `familyGroupId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `surname` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "PersonNode" DROP CONSTRAINT "PersonNode_familyGroupId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_familyGroupId_fkey";

-- DropIndex
DROP INDEX "User_email_key";

-- DropIndex
DROP INDEX "User_familyGroupId_idx";

-- AlterTable
ALTER TABLE "PersonNode" ALTER COLUMN "familyGroupId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "birthDate",
DROP COLUMN "birthPlace",
DROP COLUMN "displayName",
DROP COLUMN "email",
DROP COLUMN "familyGroupId",
DROP COLUMN "gender",
DROP COLUMN "surname";

-- CreateIndex
CREATE INDEX "User_nik_idx" ON "User"("nik");

-- AddForeignKey
ALTER TABLE "PersonNode" ADD CONSTRAINT "PersonNode_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
