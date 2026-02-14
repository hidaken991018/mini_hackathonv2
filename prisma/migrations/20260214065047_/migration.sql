/*
  Warnings:

  - A unique constraint covering the columns `[firebase_uid]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN "email" TEXT;
ALTER TABLE "users" ADD COLUMN "firebase_uid" TEXT;
ALTER TABLE "users" ADD COLUMN "image" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_inventories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "quantity_value" REAL,
    "quantity_unit" TEXT,
    "note" TEXT,
    "image_url" TEXT,
    "expire_date" DATETIME,
    "consume_by" DATETIME,
    "purchase_date" DATETIME,
    "is_staple" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "inventories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_inventories" ("consume_by", "created_at", "expire_date", "id", "image_url", "name", "note", "quantity_unit", "quantity_value", "updated_at", "user_id") SELECT "consume_by", "created_at", "expire_date", "id", "image_url", "name", "note", "quantity_unit", "quantity_value", "updated_at", "user_id" FROM "inventories";
DROP TABLE "inventories";
ALTER TABLE "new_inventories" RENAME TO "inventories";
CREATE INDEX "inventories_user_updated_at_idx" ON "inventories"("user_id", "updated_at" DESC);
CREATE INDEX "inventories_expire_date_idx" ON "inventories"("expire_date");
CREATE INDEX "inventories_consume_by_idx" ON "inventories"("consume_by");
CREATE TABLE "new_recipes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "source_type" TEXT NOT NULL DEFAULT 'ai_generated',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "cooking_time" TEXT,
    "servings" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_recipes" ("cooking_time", "created_at", "id", "image_url", "servings", "title", "updated_at") SELECT "cooking_time", "created_at", "id", "image_url", "servings", "title", "updated_at" FROM "recipes";
DROP TABLE "recipes";
ALTER TABLE "new_recipes" RENAME TO "recipes";
CREATE INDEX "recipes_user_updated_at_idx" ON "recipes"("user_id", "updated_at" DESC);
CREATE INDEX "recipes_source_type_idx" ON "recipes"("source_type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
