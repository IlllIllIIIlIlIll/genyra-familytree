/*
  Warnings:

  - A unique constraint covering the columns `[nik]` on the table `PersonNode` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nik]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `birthDate` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birthPlace` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `displayName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nik` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `surname` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "PersonNode" ADD COLUMN     "gender" "Gender",
ADD COLUMN     "nik" TEXT,
ADD COLUMN     "surname" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "birthPlace" TEXT NOT NULL,
ADD COLUMN     "displayName" TEXT NOT NULL,
ADD COLUMN     "gender" "Gender" NOT NULL,
ADD COLUMN     "nik" TEXT NOT NULL,
ADD COLUMN     "surname" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "PersonNode_nik_key" ON "PersonNode"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "User_nik_key" ON "User"("nik");
