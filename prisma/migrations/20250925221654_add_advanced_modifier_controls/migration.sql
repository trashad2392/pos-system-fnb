-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ModifierGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "minSelection" INTEGER NOT NULL DEFAULT 0,
    "selectionBudget" INTEGER NOT NULL DEFAULT 1,
    "maxSelections" INTEGER,
    "maxSelectionsSyncedToOptionCount" BOOLEAN NOT NULL DEFAULT false,
    "allowRepeatedSelections" BOOLEAN NOT NULL DEFAULT false,
    "exactBudgetRequired" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_ModifierGroup" ("id", "minSelection", "name", "selectionBudget") SELECT "id", "minSelection", "name", "selectionBudget" FROM "ModifierGroup";
DROP TABLE "ModifierGroup";
ALTER TABLE "new_ModifierGroup" RENAME TO "ModifierGroup";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
