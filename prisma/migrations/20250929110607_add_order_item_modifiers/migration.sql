/*
  Warnings:

  - You are about to drop the `_OrderItemModifiers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_OrderItemModifiers";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "OrderItemModifier" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderItemId" INTEGER NOT NULL,
    "modifierOptionId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    CONSTRAINT "OrderItemModifier_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItemModifier_modifierOptionId_fkey" FOREIGN KEY ("modifierOptionId") REFERENCES "ModifierOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderItemModifier_orderItemId_modifierOptionId_displayOrder_key" ON "OrderItemModifier"("orderItemId", "modifierOptionId", "displayOrder");
