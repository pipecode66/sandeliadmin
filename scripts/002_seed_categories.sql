-- Seed preset categories
INSERT INTO categories (name) VALUES
  ('Bebidas Frias'),
  ('Bebidas Calientes'),
  ('Postres'),
  ('Helados'),
  ('Porciones de Torta'),
  ('Sodas Organicas')
ON CONFLICT (name) DO NOTHING;
