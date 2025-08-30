/*
  Warnings:

  - You are about to alter the column `price` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `total_amount` on the `Sale` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - You are about to alter the column `price_at_sale` on the `SaleItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.
  - Added the required column `updated_at` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "stock_quantity" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Product" ("created_at", "id", "is_archived", "name", "price", "sku", "stock_quantity") SELECT "created_at", "id", "is_archived", "name", "price", "sku", "stock_quantity" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE TABLE "new_Sale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "total_amount" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Sale" ("created_at", "id", "total_amount") SELECT "created_at", "id", "total_amount" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE TABLE "new_SaleItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sale_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_at_sale" REAL NOT NULL,
    CONSTRAINT "SaleItem_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SaleItem" ("id", "price_at_sale", "product_id", "quantity", "sale_id") SELECT "id", "price_at_sale", "product_id", "quantity", "sale_id" FROM "SaleItem";
DROP TABLE "SaleItem";
ALTER TABLE "new_SaleItem" RENAME TO "SaleItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
