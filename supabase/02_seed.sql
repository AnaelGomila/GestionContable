-- =====================================================================
--  DATOS DE EJEMPLO (todos inventados; se pueden cambiar cuando quieras)
--  Ejecutar DESPUÉS de 01_schema.sql
-- =====================================================================

-- Empresa: capital inicial de $20.000.000
insert into public.empresa
  (razon_social, cuit, ingresos_brutos, inicio_actividades, domicilio, localidad, provincia, telefono,
   condicion_iva, punto_venta, capital_inicial)
values
  ('Ergo Oficinas S.R.L.', '30-71482956-0', '30-71482956-0', '2024-03-01',
   'Avenida 7 Nro. 1450', '(1900) La Plata', 'Buenos Aires', '(0221) 555-0142',
   'Responsable Inscripto', 1, 20000000);

-- Proveedor (le compramos con su Factura A)
insert into public.proveedores (razon_social, documento, condicion_iva, domicilio, localidad, provincia, telefono, email) values
  ('Maderas y Metales del Plata S.A.', '30-70815432-2', 'Responsable Inscripto',
   'Parque Industrial Lote 12', 'Ensenada', 'Buenos Aires', '(0221) 555-0377', 'ventas@maderasymetales.example');

-- Clientes: una empresa (Factura A) y consumidores finales (Factura B)
insert into public.clientes (razon_social, documento, condicion_iva, domicilio, localidad, provincia, telefono, email) values
  ('Consultora Andina S.A.', '30-69874215-8', 'Responsable Inscripto',
   'Calle 50 Nro. 820 Piso 3', 'La Plata', 'Buenos Aires', '(0221) 555-0911', 'compras@consultoraandina.example'),
  ('Lucía Fernández', '27-33456789-9', 'Consumidor Final',
   'Calle 12 Nro. 640', 'La Plata', 'Buenos Aires', '(0221) 555-0268', null),
  ('Consumidor Final', null, 'Consumidor Final', null, null, null, null, null);

-- Catálogo con stock inicial. Valorizado: costo x stock inicial = $10.000.000 exactos
--   1.480.000 + 1.176.000 + 1.420.000 + 1.280.000 + 944.000 + 950.000 + 1.300.000 + 930.000 + 520.000
insert into public.productos (codigo, nombre, costo, precio_neto, alicuota_iva, stock_inicial) values
  ('ESC-001', 'Escritorio ejecutivo 160x80',         185000, 269000, 21,  8),
  ('ESC-002', 'Escritorio operativo 140x70',          98000, 142000, 21, 12),
  ('SIL-001', 'Silla ergonómica gerencial',          142000, 205000, 21, 10),
  ('SIL-002', 'Silla operativa con ruedas',           64000,  92000, 21, 20),
  ('ARC-001', 'Archivero metálico 4 cajones',        118000, 171000, 21,  8),
  ('BIB-001', 'Biblioteca modular 5 estantes',        95000, 138000, 21, 10),
  ('MES-001', 'Mesa de reuniones 8 personas',        260000, 378000, 21,  5),
  ('MOD-001', 'Módulo de recepción',                 310000, 450000, 21,  3),
  ('CAS-001', 'Casillero metálico 12 puertas',       130000, 189000, 21,  4);

-- Control: tiene que dar 10000000
select sum(stock_inicial * costo) as stock_valorizado_inicial from public.productos;
