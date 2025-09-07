/*
  Warnings:

  - You are about to drop the column `maxSelection` on the `ModifierGroup` table. All the data in the column will be lost.
  - The required column `sku` was added to the `Category` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL
);
INSERT INTO "new_Category" ("id", "name") SELECT "id", "name" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_sku_key" ON "Category"("sku");
CREATE TABLE "new_ModifierGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "minSelection" INTEGER NOT NULL DEFAULT 0,
    "selectionBudget" INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "new_ModifierGroup" ("id", "minSelection", "name") SELECT "id", "minSelection", "name" FROM "ModifierGroup";
DROP TABLE "ModifierGroup";
ALTER TABLE "new_ModifierGroup" RENAME TO "ModifierGroup";
CREATE TABLE "new_ModifierOption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "priceAdjustment" REAL NOT NULL DEFAULT 0,
    "selectionCost" INTEGER NOT NULL DEFAULT 1,
    "modifierGroupId" INTEGER NOT NULL,
    CONSTRAINT "ModifierOption_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ModifierOption" ("id", "modifierGroupId", "name", "priceAdjustment") SELECT "id", "modifierGroupId", "name", "priceAdjustment" FROM "ModifierOption";
DROP TABLE "ModifierOption";
ALTER TABLE "new_ModifierOption" RENAME TO "ModifierOption";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
