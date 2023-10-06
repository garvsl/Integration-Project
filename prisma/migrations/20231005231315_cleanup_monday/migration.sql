/*
  Warnings:

  - You are about to drop the column `expiryDate` on the `MondayAuthCredentials` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `MondayAuthCredentials` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MondayAuthCredentials" DROP COLUMN "expiryDate",
DROP COLUMN "refreshToken";
