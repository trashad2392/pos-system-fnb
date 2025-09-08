/*
  Warnings:

  - You are about to drop the `_ProductModifierGroups` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_ProductModifierGroups";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ProductModifierGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "displayOrder" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "modifierGroupId" INTEGER NOT NULL,
    CONSTRAINT "ProductModifierGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductModifierGroup_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductModifierGroup_productId_modifierGroupId_key" ON "ProductModifierGroup"("productId", "modifierGroupId");
