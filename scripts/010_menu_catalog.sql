CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  blurb TEXT NOT NULL DEFAULT '',
  icon_key TEXT NOT NULL DEFAULT 'utensils',
  banner_image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  section_id UUID REFERENCES menu_sections(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cop INTEGER NOT NULL CHECK (price_cop >= 0),
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_categories_order ON menu_categories(sort_order, title);
CREATE INDEX IF NOT EXISTS idx_menu_sections_category ON menu_sections(category_id, sort_order, title);
CREATE INDEX IF NOT EXISTS idx_menu_products_category ON menu_products(category_id, sort_order, title);
CREATE INDEX IF NOT EXISTS idx_menu_products_section ON menu_products(section_id, sort_order, title);

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'menu_categories' AND policyname = 'admin_all_menu_categories'
  ) THEN
    CREATE POLICY "admin_all_menu_categories" ON menu_categories FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'menu_sections' AND policyname = 'admin_all_menu_sections'
  ) THEN
    CREATE POLICY "admin_all_menu_sections" ON menu_sections FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'menu_products' AND policyname = 'admin_all_menu_products'
  ) THEN
    CREATE POLICY "admin_all_menu_products" ON menu_products FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;
