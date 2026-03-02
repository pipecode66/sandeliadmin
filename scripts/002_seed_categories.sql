-- Seed preset categories
INSERT INTO categories (name, points_cost) VALUES
  ('Bebidas Frias', 40),
  ('Bebidas Calientes', 30),
  ('Postres', 60),
  ('Helados', 48),
  ('Porciones de Torta', 60),
  ('Sodas Organicas', 40)
ON CONFLICT (name) DO NOTHING;
