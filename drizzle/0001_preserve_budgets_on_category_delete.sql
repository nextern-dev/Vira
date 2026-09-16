ALTER TABLE "budgets"
  DROP CONSTRAINT IF EXISTS "budgets_category_id_categories_id_fk";

ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_category_id_categories_id_fk"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id")
  ON DELETE SET NULL;
