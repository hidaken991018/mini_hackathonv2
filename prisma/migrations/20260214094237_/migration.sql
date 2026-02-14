-- AlterTable
ALTER TABLE "inventories" ADD COLUMN     "category" TEXT,
ADD COLUMN     "is_staple" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "purchase_date" TIMESTAMP(3);
