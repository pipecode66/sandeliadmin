ALTER TABLE menu_products
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

UPDATE menu_products
SET is_featured = false
WHERE is_featured IS DISTINCT FROM false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_products_single_featured
  ON menu_products(category_id)
  WHERE is_featured = true;
