-- Seed all existing products with their categories
-- First, get category IDs and insert products

-- POSTRES
INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Parfite', 'Yogur griego, fresas, banano, mermelada de frutos rojos, acompanado de granola pumpkin spices.', c.id, '/images/products/parfite.jpg', 15
FROM categories c WHERE c.name = 'Postres';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Pie de Limon', 'Elaborado con queso crema, yogur griego y zumo de limon (Keto).', c.id, '/images/products/pie-limon.jpg', 12
FROM categories c WHERE c.name = 'Postres';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Brownie Arequipe y Almendras', 'Elaborados con harina de almendras, chocolate, mantequilla ghee, arequipe sin azucar y almendras troceadas.', c.id, '/images/products/brownie-arequipe.jpg', 12
FROM categories c WHERE c.name = 'Postres';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Brownie Full Chocolate', 'Elaborados con harina de almendras, chocolate, mantequilla ghee y ganache de chocolate.', c.id, '/images/products/brownie-arequipe.jpg', 12
FROM categories c WHERE c.name = 'Postres';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Mini Alfajor', 'Elaborado con harina de almendras, fecula de maiz, mantequilla ghee y relleno de arequipe sin azucar.', c.id, '/images/products/alfajor.jpg', 8
FROM categories c WHERE c.name = 'Postres';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Alfajor', 'Elaborado con harina de almendras, fecula de maiz, mantequilla ghee y relleno de arequipe sin azucar.', c.id, '/images/products/alfajor.jpg', 12
FROM categories c WHERE c.name = 'Postres';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Muffins', 'Elaborado con harina de almendras, mantequilla ghee, topping de yogurt griego o arequipe sin azucar.', c.id, '/images/products/muffin.jpg', 10
FROM categories c WHERE c.name = 'Postres';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Cuchareable Chocoarequipe', 'Migas de ponque de chocolate, salsa de arequipe, crema pastelera y almibar tres leches.', c.id, '/images/products/cuchareable.jpg', 15
FROM categories c WHERE c.name = 'Postres';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Cuchareable Victoria', 'Cremoso de Limon, Galleta de Avena y Ponque de Almendras.', c.id, '/images/products/cuchareable.jpg', 15
FROM categories c WHERE c.name = 'Postres';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Cuchareable Milky Way', 'Crema pastelera sin azucar, Crema de mani, ganache de chocolate al 80%, ponque de almendras y lluvia de almendras troceadas.', c.id, '/images/products/cuchareable.jpg', 15
FROM categories c WHERE c.name = 'Postres';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Cuchareable Tres Leches', 'Migas de ponque de almendras, Almibar de tres leches, crema pastelera y lluvia de chocolate.', c.id, '/images/products/cuchareable.jpg', 15
FROM categories c WHERE c.name = 'Postres';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Tartaleta de Frutos Rojos', 'Galleta de avena, crema de yogurt y queso crema con mermelada de frutos rojos.', c.id, '/images/products/tartaleta.jpg', 14
FROM categories c WHERE c.name = 'Postres';

-- HELADOS
INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Helado', 'Helado sin azucar a base de yogur con salsas a eleccion.', c.id, '/images/products/helado.jpg', 10
FROM categories c WHERE c.name = 'Helados';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Helado con Alfajor', 'Helado sin azucar a base de yogur acompanado de alfajor artesanal.', c.id, '/images/products/helado.jpg', 15
FROM categories c WHERE c.name = 'Helados';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Helado con Mini Brownie', 'Helado sin azucar a base de yogur acompanado de mini brownie de almendras.', c.id, '/images/products/helado.jpg', 15
FROM categories c WHERE c.name = 'Helados';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Malteada', 'Base de helado a eleccion y salsas.', c.id, '/images/products/malteada.jpg', 18
FROM categories c WHERE c.name = 'Helados';

-- BEBIDAS FRIAS
INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Soda de Frutos Verdes', 'Mermelada de la casa de kiwi, uva y manzana verde.', c.id, '/images/products/soda-frutos-verdes.jpg', 12
FROM categories c WHERE c.name = 'Bebidas Frias';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Soda de Frutos Rojos', 'Mermelada de la casa de arandanos, fresas y moras.', c.id, '/images/products/soda-frutos-rojos.jpg', 12
FROM categories c WHERE c.name = 'Bebidas Frias';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Soda de Frutos Amarillos', 'Mermelada de la casa de uchuvas y maracuya.', c.id, '/images/products/soda-frutos-verdes.jpg', 12
FROM categories c WHERE c.name = 'Bebidas Frias';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Limonada de Hierbabuena', 'Hojas frescas de hierbabuena, sumo de jengibre y limon.', c.id, '/images/products/limonada-hierbabuena.jpg', 10
FROM categories c WHERE c.name = 'Bebidas Frias';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Limonada de Jamaica', 'Flor de Jamaica y limon.', c.id, '/images/products/limonada-hierbabuena.jpg', 10
FROM categories c WHERE c.name = 'Bebidas Frias';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Limonada de Cafe', 'Infusion citrica con cafe.', c.id, '/images/products/limonada-hierbabuena.jpg', 10
FROM categories c WHERE c.name = 'Bebidas Frias';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Latte Frio', 'Espresso con leche cremada.', c.id, '/images/products/latte-frio.jpg', 10
FROM categories c WHERE c.name = 'Bebidas Frias';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Frapuccino', 'Delicioso cafe latte, con arequipe sin azucar, frapeado en leche deslactosada.', c.id, '/images/products/frapuccino.jpg', 15
FROM categories c WHERE c.name = 'Bebidas Frias';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Choco Frappe', 'Delicioso frappe de cacao sin azucar con ganache de chocolate.', c.id, '/images/products/frapuccino.jpg', 15
FROM categories c WHERE c.name = 'Bebidas Frias';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Frappe de Vainilla', 'Delicioso frappe de vainilla en leche deslactosada.', c.id, '/images/products/frapuccino.jpg', 15
FROM categories c WHERE c.name = 'Bebidas Frias';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Malteada de Frutos Rojos', 'Frutos frescos y mermelada de frutos rojos.', c.id, '/images/products/malteada.jpg', 18
FROM categories c WHERE c.name = 'Bebidas Frias';

-- SODAS ORGANICAS
INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Alegria', 'Sabor a Granadilla. Regenera y equilibra la flora intestinal, reduce la acidez y los sintomas de gastritis.', c.id, '/images/products/soda-frutos-verdes.jpg', 14
FROM categories c WHERE c.name = 'Sodas Organicas';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Brisa Tropical', 'Sabor a Frutos Rojos. Ayuda a prevenir la Aterosclerosis.', c.id, '/images/products/soda-frutos-rojos.jpg', 14
FROM categories c WHERE c.name = 'Sodas Organicas';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Refrescante Equilibrio', 'Sabor a te de limon. Acelera la perdida de peso, acelera el metabolismo de las grasas.', c.id, '/images/products/soda-frutos-verdes.jpg', 14
FROM categories c WHERE c.name = 'Sodas Organicas';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Fresca Vida', 'Sabor a Guayaba. Colageno natural para tu piel.', c.id, '/images/products/soda-frutos-verdes.jpg', 14
FROM categories c WHERE c.name = 'Sodas Organicas';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Salud Brillante', 'Sabor a Uva. Retarda los efectos del Envejecimiento.', c.id, '/images/products/soda-frutos-rojos.jpg', 14
FROM categories c WHERE c.name = 'Sodas Organicas';

-- BEBIDAS CALIENTES
INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Cafe Espresso', 'Cafe puro intenso.', c.id, '/images/products/capuchino.jpg', 8
FROM categories c WHERE c.name = 'Bebidas Calientes';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Americano', 'Un espresso con agua.', c.id, '/images/products/capuchino.jpg', 8
FROM categories c WHERE c.name = 'Bebidas Calientes';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Moccachino', 'Espresso con leche cremada y Chocolate.', c.id, '/images/products/capuchino.jpg', 12
FROM categories c WHERE c.name = 'Bebidas Calientes';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Capuchino', 'Espresso doble con leche cremada.', c.id, '/images/products/capuchino.jpg', 12
FROM categories c WHERE c.name = 'Bebidas Calientes';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Latte Caliente', 'Espresso sencillo con leche cremada.', c.id, '/images/products/capuchino.jpg', 10
FROM categories c WHERE c.name = 'Bebidas Calientes';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Chocolate Caliente', 'En leche deslactosada.', c.id, '/images/products/chocolate-caliente.jpg', 10
FROM categories c WHERE c.name = 'Bebidas Calientes';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Te Chai Caliente', 'Te Chai en leche caliente.', c.id, '/images/products/te-chai.jpg', 10
FROM categories c WHERE c.name = 'Bebidas Calientes';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Te Matcha Caliente', 'Te Matcha preparado caliente.', c.id, '/images/products/te-chai.jpg', 12
FROM categories c WHERE c.name = 'Bebidas Calientes';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Aromatica', 'Opciones: Jengibre, Hierbabuena y Jamaica.', c.id, '/images/products/te-chai.jpg', 8
FROM categories c WHERE c.name = 'Bebidas Calientes';

-- TORTAS (Porciones de Torta)
INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Torta Lirio', 'Elaborada con harina de almendras, endulzada con Stevia, relleno de yogur griego, arequipe sin azucar y mermelada de frutos rojos.', c.id, '/images/products/torta-lirio.jpg', 18
FROM categories c WHERE c.name = 'Porciones de Torta';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Torta Chocolata', 'Torta de Chocolate al 80% elaborada con harina de almendras y cubierto de ganache de chocolate (sin azucar).', c.id, '/images/products/torta-chocolata.jpg', 18
FROM categories c WHERE c.name = 'Porciones de Torta';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Torta Margarita', 'Elaborada con harina de almendras, endulzado con Stevia, relleno y cubierto de arequipe sin azucar y lluvia de almendras troceadas.', c.id, '/images/products/torta-margarita.jpg', 18
FROM categories c WHERE c.name = 'Porciones de Torta';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Torta Amapola', 'Elaborada con harina de almendras, aromatizada con naranja y semillas de amapola. Corazon de mermelada de frutos rojos, cubierta con yogurt griego y queso crema.', c.id, '/images/products/torta-lirio.jpg', 18
FROM categories c WHERE c.name = 'Porciones de Torta';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Torta Hortensia', 'Torta de zanahoria elaborada con harina de almendras, nueces troceadas, arandanos y coco deshidratado sin azucar.', c.id, '/images/products/torta-margarita.jpg', 18
FROM categories c WHERE c.name = 'Porciones de Torta';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Torta Astromelia', 'Torta de Banano elaborada con harina de almendras, chips de chocolate sin azucar, mousse con notas de cafe y topping de frambuesa cubierta con chocolate.', c.id, '/images/products/torta-chocolata.jpg', 18
FROM categories c WHERE c.name = 'Porciones de Torta';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Torta Cataleya', 'Elaborada con harina de almendras, rellena y cubierta con mousse de chocolate.', c.id, '/images/products/torta-chocolata.jpg', 18
FROM categories c WHERE c.name = 'Porciones de Torta';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Torta Camelia', 'Clasica torta vasca con base de crema suave y esponjosa. Con salsa de mora o arequipe.', c.id, '/images/products/torta-lirio.jpg', 18
FROM categories c WHERE c.name = 'Porciones de Torta';

INSERT INTO products (name, description, category_id, image_url, points_cost)
SELECT 'Torta Pan de Quinoa', 'Elaborado con pan sin gluten, queso y bocadillo sin azucar.', c.id, '/images/products/torta-margarita.jpg', 16
FROM categories c WHERE c.name = 'Porciones de Torta';
