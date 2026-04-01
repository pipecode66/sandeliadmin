-- Categories no longer define loyalty points.
-- Products keep their own points_cost and categories only group them.

ALTER TABLE categories
  DROP COLUMN IF EXISTS points_cost;
