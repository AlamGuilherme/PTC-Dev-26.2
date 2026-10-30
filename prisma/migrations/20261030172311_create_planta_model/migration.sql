/*
  Warnings:

  - You are about to drop the column `regaACadaDdias` on the `Planta` table. All the data in the column will be lost.
  - Added the required column `regaACadaDias` to the `Planta` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Planta" DROP COLUMN "regaACadaDdias",
ADD COLUMN     "regaACadaDias" INTEGER NOT NULL;
