-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ModifierOption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "priceAdjustment" REAL NOT NULL DEFAULT 0,
    "selectionCost" INTEGER NOT NULL DEFAULT 1,
    "modifierGroupId" INTEGER NOT NULL,
    CONSTRAINT "ModifierOption_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ModifierOption" ("id", "modifierGroupId", "name", "priceAdjustment", "selectionCost") SELECT "id", "modifierGroupId", "name", "priceAdjustment", "selectionCost" FROM "ModifierOption";
DROP TABLE "ModifierOption";
ALTER TABLE "new_ModifierOption" RENAME TO "ModifierOption";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
