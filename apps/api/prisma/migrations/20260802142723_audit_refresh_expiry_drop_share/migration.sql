-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "refreshTokenExpiresAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "ShareToken";
