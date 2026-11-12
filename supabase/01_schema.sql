-- =====================================================================
--  GESTOR CONTABLE · Esquema para Supabase (PostgreSQL)
--  Pegar completo en: Supabase > SQL Editor > New query > Run
--  Orden: 1) este archivo  2) 02_seed.sql
-- =====================================================================
--  Ideas de diseño (útiles para la defensa):
--   * Los saldos NO se guardan: se calculan siempre sumando asiento_lineas.
--   * Los asientos, sus líneas, los movimientos de stock y las facturas son
--     inmodificables (trigger). Un error se corrige con un contraasiento.
--   * El stock NO se guarda: es la suma de stock_movimientos.
--   * Toda operación (apertura, fondos, compra, venta, cobro de cheque,
--     pago a proveedor, asiento manual) es una función que escribe documento,
--     asiento y stock en UNA transacción: o se guarda todo o no se guarda nada.
--   * La partida doble (debe = haber) se valida con un trigger diferido.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

create table public.empresa (
  id                  smallint primary key default 1 check (id = 1),   -- una sola empresa
  razon_social        text not null,
  cuit                text not null,
  ingresos_brutos     text,
  inicio_actividades  date,
  domicilio           text,
  localidad           text,
  provincia           text,
  telefono            text,
  condicion_iva       text not null default 'Responsable Inscripto',
  punto_venta         smallint not null default 1 check (punto_venta between 1 and 9999),
  capital_inicial     numeric(14,2) not null check (capital_inicial > 0),
  apertura_registrada boolean not null default false,
  fecha_apertura      date
);

create table public.cuentas (
  id          int generated always as identity primary key,
  codigo      text not null unique,
  nombre      text not null,
  tipo        text not null check (tipo in ('activo','pasivo','patrimonio','ingreso','egreso')),
  es_control  boolean not null default false,   -- cuenta de control: solo se mueve con operaciones (no con asiento manual)
  created_at  timestamptz not null default now()
);

-- Contador correlativo sin saltos (se revierte si la operación falla)
create table public.numeracion (
  clave  text primary key,
  ultimo int not null default 0
);

create table public.asientos (
  id                bigint generated always as identity primary key,
  numero            int not null unique,
  fecha             date not null,
  descripcion       text not null,
  origen            text not null check (origen in
                      ('apertura','compra','venta','fondos','cobro_cheque','pago_proveedor','manual','anulacion')),
  referencia_id     bigint,
  anula_asiento_id  bigint references public.asientos(id),
  created_by        uuid default auth.uid(),
  created_at        timestamptz not null default now()
);
create unique index asientos_una_anulacion on public.asientos(anula_asiento_id) where anula_asiento_id is not null;
create index asientos_fecha_idx on public.asientos(fecha, numero);

create table public.asiento_lineas (
  id          bigint generated always as identity primary key,
  asiento_id  bigint not null references public.asientos(id),
  cuenta_id   int    not null references public.cuentas(id),
  debe        numeric(14,2) not null default 0 check (debe  >= 0),
  haber       numeric(14,2) not null default 0 check (haber >= 0),
  check ((debe = 0 or haber = 0) and (debe + haber) > 0)
);
create index asiento_lineas_asiento_idx on public.asiento_lineas(asiento_id);
create index asiento_lineas_cuenta_idx  on public.asiento_lineas(cuenta_id);

create table public.clientes (
  id             bigint generated always as identity primary key,
  razon_social   text not null,
  documento      text,                                   -- CUIT / CUIL / DNI
  condicion_iva  text not null check (condicion_iva in
                   ('Responsable Inscripto','Monotributo','Exento','Consumidor Final')),
  domicilio      text,
  localidad      text,
  provincia      text,
  telefono       text,
  email          text,
  created_at     timestamptz not null default now()
);

create table public.proveedores (
  id             bigint generated always as identity primary key,
  razon_social   text not null,
  documento      text,
  condicion_iva  text not null default 'Responsable Inscripto',
  domicilio      text,
  localidad      text,
  provincia      text,
  telefono       text,
  email          text,
  created_at     timestamptz not null default now()
);

create table public.productos (
  id            bigint generated always as identity primary key,
  codigo        text not null unique,
  nombre        text not null,
  costo         numeric(14,2) not null check (costo >= 0),
  precio_neto   numeric(14,2) not null check (precio_neto >= 0),
  alicuota_iva  numeric(4,1)  not null default 21 check (alicuota_iva in (10.5, 21)),
  stock_inicial int not null default 0 check (stock_inicial >= 0),   -- solo se usa para el asiento de apertura
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.stock_movimientos (
  id              bigint generated always as identity primary key,
  producto_id     bigint not null references public.productos(id),
  fecha           date not null,
  tipo            text not null check (tipo in ('apertura','compra','venta')),
  cantidad        int  not null check (cantidad <> 0),           -- + entra / - sale
  costo_unitario  numeric(14,2) not null,
  referencia_id   bigint,
  created_at      timestamptz not null default now()
);
create index stock_mov_producto_idx on public.stock_movimientos(producto_id);

create table public.compras (
  id            bigint generated always as identity primary key,
  fecha         date not null,
  proveedor_id  bigint not null references public.proveedores(id),
  comprobante   text not null,
  neto          numeric(14,2) not null default 0,
  iva           numeric(14,2) not null default 0,
  total         numeric(14,2) not null default 0,
  asiento_id    bigint references public.asientos(id),
  created_at    timestamptz not null default now()
);

create table public.compra_items (
  id              bigint generated always as identity primary key,
  compra_id       bigint not null references public.compras(id),
  producto_id     bigint not null references public.productos(id),
  codigo          text not null,
  descripcion     text not null,
  cantidad        int not null check (cantidad > 0),
  costo_unitario  numeric(14,2) not null check (costo_unitario >= 0),
  alicuota_iva    numeric(4,1) not null,
  neto            numeric(14,2) not null
);

create table public.compra_pagos (
  id          bigint generated always as identity primary key,
  compra_id   bigint not null references public.compras(id),
  fecha       date not null,
  monto       numeric(14,2) not null check (monto > 0),
  medio       text not null check (medio in ('caja','banco')),
  asiento_id  bigint references public.asientos(id),
  created_at  timestamptz not null default now()
);

create table public.ventas (
  id            bigint generated always as identity primary key,
  fecha         date not null,
  cliente_id    bigint not null references public.clientes(id),
  tipo_factura  char(1) not null check (tipo_factura in ('A','B')),
  neto          numeric(14,2) not null default 0,
  iva           numeric(14,2) not null default 0,
  total         numeric(14,2) not null default 0,
  costo_total   numeric(14,2) not null default 0,
  asiento_id    bigint references public.asientos(id),
  created_at    timestamptz not null default now()
);

create table public.venta_items (
  id              bigint generated always as identity primary key,
  venta_id        bigint not null references public.ventas(id),
  producto_id     bigint not null references public.productos(id),
  codigo          text not null,
  descripcion     text not null,
  cantidad        int not null check (cantidad > 0),
  precio_unitario numeric(14,2) not null check (precio_unitario >= 0),   -- neto
  costo_unitario  numeric(14,2) not null,
  alicuota_iva    numeric(4,1) not null,
  neto            numeric(14,2) not null
);

create table public.venta_pagos (
  id                bigint generated always as identity primary key,
  venta_id          bigint not null references public.ventas(id),
  medio             text not null check (medio in ('efectivo','transferencia','cheque_dia','cheque_diferido')),
  monto             numeric(14,2) not null check (monto > 0),
  banco             text,
  numero_cheque     text,
  fecha_cobro       date,                                   -- vencimiento del cheque diferido
  estado            text not null default 'cobrado' check (estado in ('cobrado','pendiente')),
  fecha_cobrado     date,
  asiento_cobro_id  bigint references public.asientos(id),
  created_at        timestamptz not null default now()
);

create table public.facturas (
  id               bigint generated always as identity primary key,
  tipo             char(1) not null check (tipo in ('A','B')),
  punto_venta      smallint not null,
  numero           int not null,
  fecha            date not null,
  venta_id         bigint not null unique references public.ventas(id),
  cae              text not null,
  cae_vto          date not null,
  neto             numeric(14,2) not null,
  iva21            numeric(14,2) not null default 0,
  iva105           numeric(14,2) not null default 0,
  total            numeric(14,2) not null,
  condicion_venta  text not null,
  emisor           jsonb not null,    -- copia de los datos de la empresa al momento de emitir
  receptor         jsonb not null,    -- copia de los datos del cliente al momento de emitir
  created_at       timestamptz not null default now(),
  unique (tipo, punto_venta, numero)
);

-- ---------------------------------------------------------------------
-- 2. DATOS BASE: numeración y plan de cuentas
-- ---------------------------------------------------------------------

insert into public.numeracion (clave, ultimo) values ('asiento', 0), ('factura_A', 0), ('factura_B', 0);

insert into public.cuentas (codigo, nombre, tipo, es_control) values
  ('1.1.01','Caja','activo',false),
  ('1.1.02','Banco cuenta corriente','activo',false),
  ('1.1.03','Cheques diferidos a cobrar','activo',true),
  ('1.1.04','Deudores por ventas','activo',false),
  ('1.1.05','Mercaderías','activo',true),
  ('1.1.06','IVA crédito fiscal','activo',false),
  ('1.2.01','Muebles y útiles','activo',false),
  ('1.2.02','Equipos de computación','activo',false),
  ('1.2.03','Rodados','activo',false),
  ('1.2.04','Inmuebles','activo',false),
  ('2.1.01','Proveedores','pasivo',true),
  ('2.1.02','IVA débito fiscal','pasivo',false),
  ('2.1.03','IVA a pagar','pasivo',false),
  ('2.1.04','Sueldos a pagar','pasivo',false),
  ('2.1.05','Cargas sociales a pagar','pasivo',false),
  ('2.1.06','Préstamos bancarios','pasivo',false),
  ('2.1.07','Acreedores varios','pasivo',false),
  ('3.1.01','Capital social','patrimonio',false),
  ('3.2.01','Resultados no asignados','patrimonio',false),
  ('3.2.02','Reserva legal','patrimonio',false),
  ('4.1.01','Ventas','ingreso',false),
  ('4.2.01','Intereses ganados','ingreso',false),
  ('4.2.02','Otros ingresos','ingreso',false),
  ('5.1.01','Costo de mercaderías vendidas','egreso',false),
  ('5.2.01','Sueldos y jornales','egreso',false),
  ('5.2.02','Alquileres','egreso',false),
  ('5.2.03','Servicios (luz, gas, internet)','egreso',false),
  ('5.2.04','Gastos de administración','egreso',false),
  ('5.2.05','Impuestos y tasas','egreso',false),
  ('5.2.06','Gastos bancarios','egreso',false),
  ('5.2.07','Intereses perdidos','egreso',false),
  ('5.2.08','Publicidad','egreso',false);

-- ---------------------------------------------------------------------
-- 3. INTEGRIDAD: triggers
-- ---------------------------------------------------------------------

-- 3.1 Lo contable no se modifica ni se borra
create function public.bloquear_modificacion() returns trigger
language plpgsql as $$
begin
  raise exception 'Los registros de "%" no se pueden modificar ni eliminar. Para corregir, agregá un nuevo asiento.', tg_table_name;
end $$;

create trigger asientos_inmutables      before update or delete on public.asientos          for each row       execute function public.bloquear_modificacion();
create trigger lineas_inmutables        before update or delete on public.asiento_lineas    for each row       execute function public.bloquear_modificacion();
create trigger stock_mov_inmutables     before update or delete on public.stock_movimientos for each row       execute function public.bloquear_modificacion();
create trigger facturas_inmutables      before update or delete on public.facturas          for each row       execute function public.bloquear_modificacion();
create trigger asientos_no_truncate     before truncate on public.asientos                  for each statement execute function public.bloquear_modificacion();
create trigger lineas_no_truncate       before truncate on public.asiento_lineas            for each statement execute function public.bloquear_modificacion();

-- 3.2 Partida doble: al cerrar la transacción cada asiento debe tener >= 2 líneas y debe = haber
create function public.verificar_asiento_balanceado() returns trigger
language plpgsql as $$
declare v_debe numeric; v_haber numeric; v_n int;
begin
  select coalesce(sum(debe),0), coalesce(sum(haber),0), count(*)
    into v_debe, v_haber, v_n
    from public.asiento_lineas where asiento_id = new.asiento_id;
  if v_n < 2 then
    raise exception 'El asiento % debe tener al menos dos líneas.', new.asiento_id;
  end if;
  if v_debe <> v_haber then
    raise exception 'El asiento % no balancea: debe $% ≠ haber $%.', new.asiento_id, v_debe, v_haber;
  end if;
  return null;
end $$;

create constraint trigger asiento_balanceado
  after insert on public.asiento_lineas
  deferrable initially deferred
  for each row execute function public.verificar_asiento_balanceado();

-- 3.3 Una vez registrada la apertura no se puede cambiar el capital ni el stock inicial
create function public.proteger_apertura() returns trigger
language plpgsql as $$
begin
  if tg_table_name = 'empresa' then
    if old.apertura_registrada and
       (new.capital_inicial is distinct from old.capital_inicial
        or new.apertura_registrada is distinct from old.apertura_registrada
        or new.fecha_apertura is distinct from old.fecha_apertura) then
      raise exception 'La apertura ya fue registrada: el capital inicial no se puede modificar.';
    end if;
  else  -- productos
    if exists (select 1 from public.empresa where apertura_registrada)
       and ((tg_op = 'INSERT' and new.stock_inicial <> 0)
         or (tg_op = 'UPDATE' and new.stock_inicial is distinct from old.stock_inicial)) then
      raise exception 'El stock solo cambia con compras y ventas registradas (la apertura ya fue registrada).';
    end if;
  end if;
  return new;
end $$;

create trigger empresa_proteger_apertura   before update           on public.empresa   for each row execute function public.proteger_apertura();
create trigger productos_proteger_apertura before insert or update on public.productos for each row execute function public.proteger_apertura();

-- ---------------------------------------------------------------------
-- 4. VISTAS (los saldos y el stock se calculan, no se guardan)
-- ---------------------------------------------------------------------

create view public.v_saldos with (security_invoker = on) as
select c.id as cuenta_id, c.codigo, c.nombre, c.tipo, c.es_control,
       coalesce(sum(l.debe), 0)  as debe,
       coalesce(sum(l.haber), 0) as haber,
       coalesce(sum(case when c.tipo in ('activo','egreso') then l.debe - l.haber else l.haber - l.debe end), 0) as saldo
from public.cuentas c
left join public.asiento_lineas l on l.cuenta_id = c.id
group by c.id;

create view public.v_stock with (security_invoker = on) as
select p.id as producto_id,
       coalesce(sum(m.cantidad), 0)::int as stock,
       coalesce(sum(m.cantidad * m.costo_unitario), 0) as valor
from public.productos p
left join public.stock_movimientos m on m.producto_id = p.id
group by p.id;

create view public.v_compras with (security_invoker = on) as
select c.*, p.pagado, c.total - p.pagado as saldo
from public.compras c
cross join lateral (select coalesce(sum(monto), 0) as pagado from public.compra_pagos where compra_id = c.id) p;

-- Controles: el libro mayor debe coincidir con los registros auxiliares
create view public.v_controles with (security_invoker = on) as
select 'Mercaderías (libro) vs. stock valorizado'::text as control,
       (select saldo from public.v_saldos where codigo = '1.1.05') as libro,
       (select coalesce(sum(valor), 0) from public.v_stock) as auxiliar
union all
select 'Cheques diferidos a cobrar (libro) vs. cheques pendientes',
       (select saldo from public.v_saldos where codigo = '1.1.03'),
       (select coalesce(sum(monto), 0) from public.venta_pagos where medio = 'cheque_diferido' and estado = 'pendiente')
union all
select 'Proveedores (libro) vs. saldo de compras impagas',
       (select saldo from public.v_saldos where codigo = '2.1.01'),
       (select coalesce(sum(saldo), 0) from public.v_compras);

-- ---------------------------------------------------------------------
-- 5. FUNCIONES INTERNAS (no expuestas a la API)
-- ---------------------------------------------------------------------

create function public._siguiente(p_clave text) returns int
language plpgsql as $$
declare v int;
begin
  update public.numeracion set ultimo = ultimo + 1 where clave = p_clave returning ultimo into v;
  if v is null then raise exception 'Numeración inexistente: %', p_clave; end if;
  return v;
end $$;

create function public._saldo(p_codigo text) returns numeric
language sql stable as $$
  select coalesce(sum(case when c.tipo in ('activo','egreso') then l.debe - l.haber else l.haber - l.debe end), 0)
  from public.cuentas c left join public.asiento_lineas l on l.cuenta_id = c.id
  where c.codigo = p_codigo
$$;

create function public._validar_fecha(p_fecha date) returns void
language plpgsql as $$
declare e public.empresa%rowtype;
begin
  select * into e from public.empresa where id = 1;
  if not found or not e.apertura_registrada then
    raise exception 'Primero registrá el asiento de apertura en "Empresa y capital".';
  end if;
  if p_fecha is null then raise exception 'Ingresá la fecha.'; end if;
  if p_fecha < e.fecha_apertura then
    raise exception 'La fecha no puede ser anterior a la apertura (%).', to_char(e.fecha_apertura, 'DD/MM/YYYY');
  end if;
end $$;

-- Crea un asiento a partir de un jsonb: [{"cuenta":"1.1.01","debe":100,"haber":0}, ...]
create function public._crear_asiento(p_fecha date, p_desc text, p_origen text, p_ref bigint,
                                      p_lineas jsonb, p_anula bigint default null) returns bigint
language plpgsql as $$
declare v_id bigint; l jsonb; v_cuenta int; v_debe numeric; v_haber numeric;
begin
  insert into public.asientos (numero, fecha, descripcion, origen, referencia_id, anula_asiento_id)
  values (public._siguiente('asiento'), p_fecha, p_desc, p_origen, p_ref, p_anula)
  returning id into v_id;

  for l in select * from jsonb_array_elements(p_lineas) loop
    v_debe  := round(coalesce((l->>'debe')::numeric, 0), 2);
    v_haber := round(coalesce((l->>'haber')::numeric, 0), 2);
    continue when v_debe = 0 and v_haber = 0;
    select id into v_cuenta from public.cuentas where codigo = l->>'cuenta';
    if v_cuenta is null then raise exception 'La cuenta "%" no existe.', l->>'cuenta'; end if;
    insert into public.asiento_lineas (asiento_id, cuenta_id, debe, haber) values (v_id, v_cuenta, v_debe, v_haber);
  end loop;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- 6. OPERACIONES (se llaman desde el frontend con supabase.rpc)
-- ---------------------------------------------------------------------

-- 6.1 Apertura: reparte el capital en cuentas de activo.
--     Mercaderías sale automáticamente del stock inicial cargado en productos.
create function public.registrar_apertura(p_fecha date, p_montos jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  e public.empresa%rowtype; v_merc numeric; v_total numeric := 0; v_lineas jsonb := '[]'::jsonb;
  k text; v numeric; v_tipo text; v_control boolean; v_id bigint;
begin
  select * into e from public.empresa where id = 1 for update;
  if not found then raise exception 'Cargá primero los datos de la empresa.'; end if;
  if e.apertura_registrada then raise exception 'La apertura ya fue registrada.'; end if;
  if p_fecha is null then raise exception 'Ingresá la fecha de apertura.'; end if;

  select coalesce(sum(stock_inicial * costo), 0) into v_merc from public.productos;

  for k, v in select key, value::numeric from jsonb_each_text(coalesce(p_montos, '{}'::jsonb)) loop
    if k = '1.1.05' then
      raise exception 'Mercaderías se calcula automáticamente con el stock inicial de los productos.';
    end if;
    select tipo, es_control into v_tipo, v_control from public.cuentas where codigo = k;
    if v_tipo is distinct from 'activo' or v_control then
      raise exception 'La cuenta % no admite saldo inicial.', k;
    end if;
    if v < 0 then raise exception 'Los montos no pueden ser negativos.'; end if;
    if v > 0 then
      v_lineas := v_lineas || jsonb_build_object('cuenta', k, 'debe', v, 'haber', 0);
      v_total  := v_total + v;
    end if;
  end loop;

  if v_merc > 0 then
    v_lineas := v_lineas || jsonb_build_object('cuenta', '1.1.05', 'debe', v_merc, 'haber', 0);
    v_total  := v_total + v_merc;
  end if;

  if v_total <> e.capital_inicial then
    raise exception 'El activo inicial ($%) debe ser igual al capital ($%).', v_total, e.capital_inicial;
  end if;

  v_lineas := v_lineas || jsonb_build_object('cuenta', '3.1.01', 'debe', 0, 'haber', v_total);
  v_id := public._crear_asiento(p_fecha, 'Asiento de apertura - Capital inicial', 'apertura', null, v_lineas);

  insert into public.stock_movimientos (producto_id, fecha, tipo, cantidad, costo_unitario, referencia_id)
  select id, p_fecha, 'apertura', stock_inicial, costo, v_id from public.productos where stock_inicial > 0;

  update public.empresa set apertura_registrada = true, fecha_apertura = p_fecha where id = 1;
  return v_id;
end $$;

-- 6.2 Movimiento de fondos (reorganización del capital): debe destino / haber origen
create function public.registrar_fondos(p_fecha date, p_origen text, p_destino text,
                                        p_monto numeric, p_descripcion text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_no text; v_nd text; v_desc text;
begin
  perform public._validar_fecha(p_fecha);
  if p_monto is null or p_monto <= 0 then raise exception 'El monto debe ser mayor a cero.'; end if;
  if p_origen not in ('1.1.01','1.1.02') then raise exception 'Los fondos solo pueden salir de Caja o Banco.'; end if;
  if p_destino not in ('1.1.01','1.1.02','1.2.01','1.2.02','1.2.03','1.2.04') then
    raise exception 'Destino de fondos no permitido.';
  end if;
  if p_origen = p_destino then raise exception 'El origen y el destino deben ser distintos.'; end if;
  if public._saldo(p_origen) < p_monto then
    raise exception 'Fondos insuficientes: el saldo de % es $%.', p_origen, public._saldo(p_origen);
  end if;
  select nombre into v_no from public.cuentas where codigo = p_origen;
  select nombre into v_nd from public.cuentas where codigo = p_destino;
  v_desc := coalesce(nullif(trim(p_descripcion), ''), format('Movimiento de fondos: %s a %s', v_no, v_nd));
  return public._crear_asiento(p_fecha, v_desc, 'fondos', null, jsonb_build_array(
    jsonb_build_object('cuenta', p_destino, 'debe', p_monto, 'haber', 0),
    jsonb_build_object('cuenta', p_origen,  'debe', 0,       'haber', p_monto)));
end $$;

-- 6.3 Compra a proveedor: suma stock, IVA crédito fiscal y queda en Proveedores
--     p_items: [{"producto_id":1,"cantidad":5,"costo_unitario":185000}]
create function public.registrar_compra(p_fecha date, p_proveedor_id bigint, p_comprobante text, p_items jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  prov public.proveedores%rowtype; prod public.productos%rowtype; it jsonb;
  v_id bigint; v_asiento bigint; v_cant int; v_costo numeric; v_n numeric; v_i numeric;
  v_neto numeric := 0; v_iva numeric := 0; v_total numeric;
begin
  perform public._validar_fecha(p_fecha);
  select * into prov from public.proveedores where id = p_proveedor_id;
  if not found then raise exception 'Elegí un proveedor.'; end if;
  if nullif(trim(p_comprobante), '') is null then raise exception 'Ingresá el número de comprobante del proveedor.'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Agregá al menos un producto.'; end if;

  insert into public.compras (fecha, proveedor_id, comprobante) values (p_fecha, p_proveedor_id, trim(p_comprobante))
  returning id into v_id;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into prod from public.productos where id = (it->>'producto_id')::bigint;
    if not found then raise exception 'Producto inexistente.'; end if;
    v_cant  := (it->>'cantidad')::int;
    v_costo := round((it->>'costo_unitario')::numeric, 2);
    if v_cant is null or v_cant <= 0 then raise exception 'La cantidad de % debe ser mayor a cero.', prod.nombre; end if;
    if v_costo is null or v_costo < 0 then raise exception 'El costo de % es inválido.', prod.nombre; end if;
    v_n := round(v_cant * v_costo, 2);
    v_i := round(v_n * prod.alicuota_iva / 100, 2);
    insert into public.compra_items (compra_id, producto_id, codigo, descripcion, cantidad, costo_unitario, alicuota_iva, neto)
    values (v_id, prod.id, prod.codigo, prod.nombre, v_cant, v_costo, prod.alicuota_iva, v_n);
    insert into public.stock_movimientos (producto_id, fecha, tipo, cantidad, costo_unitario, referencia_id)
    values (prod.id, p_fecha, 'compra', v_cant, v_costo, v_id);
    v_neto := v_neto + v_n; v_iva := v_iva + v_i;
  end loop;

  v_total := v_neto + v_iva;
  v_asiento := public._crear_asiento(p_fecha, format('Compra %s - %s', trim(p_comprobante), prov.razon_social),
    'compra', v_id, jsonb_build_array(
      jsonb_build_object('cuenta', '1.1.05', 'debe', v_neto,  'haber', 0),
      jsonb_build_object('cuenta', '1.1.06', 'debe', v_iva,   'haber', 0),
      jsonb_build_object('cuenta', '2.1.01', 'debe', 0,       'haber', v_total)));

  update public.compras set neto = v_neto, iva = v_iva, total = v_total, asiento_id = v_asiento where id = v_id;
  return v_id;
end $$;

-- 6.4 Pago (total o parcial) a un proveedor: debe Proveedores / haber Caja o Banco
create function public.registrar_pago_proveedor(p_compra_id bigint, p_fecha date, p_monto numeric, p_medio text) returns bigint
language plpgsql security definer set search_path = public as $$
declare c public.v_compras%rowtype; v_cuenta text; v_asiento bigint;
begin
  perform public._validar_fecha(p_fecha);
  select * into c from public.v_compras where id = p_compra_id;
  if not found then raise exception 'Compra inexistente.'; end if;
  if p_fecha < c.fecha then raise exception 'El pago no puede ser anterior a la compra.'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'El monto debe ser mayor a cero.'; end if;
  if p_monto > c.saldo then raise exception 'El monto supera el saldo de la compra ($%).', c.saldo; end if;
  v_cuenta := case p_medio when 'caja' then '1.1.01' when 'banco' then '1.1.02' else null end;
  if v_cuenta is null then raise exception 'Medio de pago inválido.'; end if;
  if public._saldo(v_cuenta) < p_monto then raise exception 'Fondos insuficientes en % ($%).', p_medio, public._saldo(v_cuenta); end if;

  v_asiento := public._crear_asiento(p_fecha, format('Pago a proveedor - Compra %s', c.comprobante), 'pago_proveedor', p_compra_id,
    jsonb_build_array(
      jsonb_build_object('cuenta', '2.1.01', 'debe', p_monto, 'haber', 0),
      jsonb_build_object('cuenta', v_cuenta, 'debe', 0,       'haber', p_monto)));
  insert into public.compra_pagos (compra_id, fecha, monto, medio, asiento_id) values (p_compra_id, p_fecha, p_monto, p_medio, v_asiento);
  return v_asiento;
end $$;

-- 6.5 Venta + factura A/B + asiento + baja de stock + cobros (uno o varios medios)
--     p_items: [{"producto_id":1,"cantidad":2,"precio_unitario":269000}]
--     p_pagos: [{"medio":"cheque_diferido","monto":1000,"banco":"Banco X","numero_cheque":"123","fecha_cobro":"2026-12-30"}]
create function public.registrar_venta(p_fecha date, p_cliente_id bigint, p_items jsonb, p_pagos jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e public.empresa%rowtype; cli public.clientes%rowtype; prod public.productos%rowtype; it jsonb; pg jsonb;
  v_tipo char(1); v_id bigint; v_asiento bigint; v_fac bigint; v_num int; v_stock int;
  v_cant int; v_precio numeric; v_n numeric; v_i numeric;
  v_neto numeric := 0; v_iva21 numeric := 0; v_iva105 numeric := 0; v_total numeric; v_costo numeric := 0;
  v_caja numeric := 0; v_banco numeric := 0; v_chq numeric := 0; v_pagado numeric := 0;
  v_medio text; v_monto numeric; v_desc text; v_cond text;
begin
  perform public._validar_fecha(p_fecha);
  select * into e from public.empresa where id = 1;
  select * into cli from public.clientes where id = p_cliente_id;
  if not found then raise exception 'Elegí un cliente.'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Agregá al menos un producto.'; end if;
  if p_pagos is null or jsonb_array_length(p_pagos) = 0 then raise exception 'Agregá al menos un medio de pago.'; end if;

  v_tipo := case when cli.condicion_iva = 'Responsable Inscripto' then 'A' else 'B' end;
  v_num  := public._siguiente('factura_' || v_tipo);

  insert into public.ventas (fecha, cliente_id, tipo_factura) values (p_fecha, p_cliente_id, v_tipo) returning id into v_id;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into prod from public.productos where id = (it->>'producto_id')::bigint for update;
    if not found then raise exception 'Producto inexistente.'; end if;
    v_cant   := (it->>'cantidad')::int;
    v_precio := round((it->>'precio_unitario')::numeric, 2);
    if v_cant is null or v_cant <= 0 then raise exception 'La cantidad de % debe ser mayor a cero.', prod.nombre; end if;
    if v_precio is null or v_precio < 0 then raise exception 'El precio de % es inválido.', prod.nombre; end if;
    select stock into v_stock from public.v_stock where producto_id = prod.id;
    if v_stock < v_cant then
      raise exception 'Stock insuficiente de "%": disponible %, pedido %.', prod.nombre, v_stock, v_cant;
    end if;
    v_n := round(v_cant * v_precio, 2);
    v_i := round(v_n * prod.alicuota_iva / 100, 2);
    insert into public.venta_items (venta_id, producto_id, codigo, descripcion, cantidad, precio_unitario, costo_unitario, alicuota_iva, neto)
    values (v_id, prod.id, prod.codigo, prod.nombre, v_cant, v_precio, prod.costo, prod.alicuota_iva, v_n);
    insert into public.stock_movimientos (producto_id, fecha, tipo, cantidad, costo_unitario, referencia_id)
    values (prod.id, p_fecha, 'venta', -v_cant, prod.costo, v_id);
    v_neto := v_neto + v_n;
    if prod.alicuota_iva = 21 then v_iva21 := v_iva21 + v_i; else v_iva105 := v_iva105 + v_i; end if;
    v_costo := v_costo + round(v_cant * prod.costo, 2);
  end loop;
  v_total := v_neto + v_iva21 + v_iva105;

  for pg in select * from jsonb_array_elements(p_pagos) loop
    v_medio := pg->>'medio';
    v_monto := round((pg->>'monto')::numeric, 2);
    if v_monto is null or v_monto <= 0 then raise exception 'Cada medio de pago debe tener un monto mayor a cero.'; end if;
    if v_medio = 'efectivo' then
      v_caja := v_caja + v_monto;
    elsif v_medio = 'transferencia' then
      v_banco := v_banco + v_monto;
    elsif v_medio in ('cheque_dia','cheque_diferido') then
      if nullif(trim(pg->>'banco'), '') is null or nullif(trim(pg->>'numero_cheque'), '') is null then
        raise exception 'Completá el banco y el número del cheque.';
      end if;
      if v_medio = 'cheque_dia' then
        v_banco := v_banco + v_monto;
      else
        if nullif(pg->>'fecha_cobro', '') is null or (pg->>'fecha_cobro')::date < p_fecha then
          raise exception 'La fecha de cobro del cheque diferido debe ser igual o posterior a la fecha de la venta.';
        end if;
        v_chq := v_chq + v_monto;
      end if;
    else
      raise exception 'Medio de pago inválido: %', v_medio;
    end if;
    insert into public.venta_pagos (venta_id, medio, monto, banco, numero_cheque, fecha_cobro, estado, fecha_cobrado)
    values (v_id, v_medio, v_monto, nullif(trim(pg->>'banco'), ''), nullif(trim(pg->>'numero_cheque'), ''),
            case when v_medio = 'cheque_diferido' then (pg->>'fecha_cobro')::date end,
            case when v_medio = 'cheque_diferido' then 'pendiente' else 'cobrado' end,
            case when v_medio = 'cheque_diferido' then null else p_fecha end);
    v_pagado := v_pagado + v_monto;
  end loop;
  if v_pagado <> v_total then
    raise exception 'Los medios de pago ($%) deben sumar el total de la venta ($%).', v_pagado, v_total;
  end if;

  v_desc := format('Venta Factura %s %s-%s - %s', v_tipo, lpad(e.punto_venta::text, 4, '0'), lpad(v_num::text, 8, '0'), cli.razon_social);
  v_asiento := public._crear_asiento(p_fecha, v_desc, 'venta', v_id, jsonb_build_array(
    jsonb_build_object('cuenta', '1.1.01', 'debe', v_caja,  'haber', 0),
    jsonb_build_object('cuenta', '1.1.02', 'debe', v_banco, 'haber', 0),
    jsonb_build_object('cuenta', '1.1.03', 'debe', v_chq,   'haber', 0),
    jsonb_build_object('cuenta', '5.1.01', 'debe', v_costo, 'haber', 0),
    jsonb_build_object('cuenta', '4.1.01', 'debe', 0, 'haber', v_neto),
    jsonb_build_object('cuenta', '2.1.02', 'debe', 0, 'haber', v_iva21 + v_iva105),
    jsonb_build_object('cuenta', '1.1.05', 'debe', 0, 'haber', v_costo)));

  v_cond := case when v_chq > 0 then 'Cheque diferido' else 'Contado' end;
  insert into public.facturas (tipo, punto_venta, numero, fecha, venta_id, cae, cae_vto, neto, iva21, iva105, total,
                               condicion_venta, emisor, receptor)
  values (v_tipo, e.punto_venta, v_num, p_fecha, v_id,
          '7' || lpad(floor(random() * 1e13)::bigint::text, 13, '0'), p_fecha + 10,
          v_neto, v_iva21, v_iva105, v_total, v_cond,
          jsonb_build_object('razon_social', e.razon_social, 'cuit', e.cuit, 'ingresos_brutos', e.ingresos_brutos,
                             'inicio_actividades', e.inicio_actividades, 'domicilio', e.domicilio, 'localidad', e.localidad,
                             'provincia', e.provincia, 'telefono', e.telefono, 'condicion_iva', e.condicion_iva),
          jsonb_build_object('razon_social', cli.razon_social, 'documento', cli.documento, 'condicion_iva', cli.condicion_iva,
                             'domicilio', cli.domicilio, 'localidad', cli.localidad, 'provincia', cli.provincia,
                             'telefono', cli.telefono))
  returning id into v_fac;

  update public.ventas set neto = v_neto, iva = v_iva21 + v_iva105, total = v_total, costo_total = v_costo, asiento_id = v_asiento
  where id = v_id;

  return jsonb_build_object('venta_id', v_id, 'factura_id', v_fac, 'asiento_id', v_asiento);
end $$;

-- 6.6 Cobro de un cheque diferido: debe Banco / haber Cheques diferidos a cobrar
create function public.cobrar_cheque(p_pago_id bigint, p_fecha date) returns bigint
language plpgsql security definer set search_path = public as $$
declare pg public.venta_pagos%rowtype; v_fecha_venta date; v_asiento bigint;
begin
  perform public._validar_fecha(p_fecha);
  select * into pg from public.venta_pagos where id = p_pago_id for update;
  if not found then raise exception 'Cheque inexistente.'; end if;
  if pg.medio <> 'cheque_diferido' or pg.estado <> 'pendiente' then raise exception 'Ese cheque no está pendiente de cobro.'; end if;
  select fecha into v_fecha_venta from public.ventas where id = pg.venta_id;
  if p_fecha < v_fecha_venta then raise exception 'El cobro no puede ser anterior a la venta.'; end if;

  v_asiento := public._crear_asiento(p_fecha, format('Cobro de cheque diferido Nº %s (%s)', pg.numero_cheque, pg.banco),
    'cobro_cheque', pg.id, jsonb_build_array(
      jsonb_build_object('cuenta', '1.1.02', 'debe', pg.monto, 'haber', 0),
      jsonb_build_object('cuenta', '1.1.03', 'debe', 0,        'haber', pg.monto)));
  update public.venta_pagos set estado = 'cobrado', fecha_cobrado = p_fecha, asiento_cobro_id = v_asiento where id = p_pago_id;
  return v_asiento;
end $$;

-- 6.7 Asiento manual (no admite cuentas de control)
--     p_lineas: [{"cuenta":"5.2.02","debe":150000,"haber":0}, {"cuenta":"1.1.02","debe":0,"haber":150000}]
create function public.registrar_asiento_manual(p_fecha date, p_descripcion text, p_lineas jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare l jsonb; v_control boolean; v_nombre text; v_debe numeric := 0; v_haber numeric := 0; v_n int := 0;
begin
  perform public._validar_fecha(p_fecha);
  if nullif(trim(p_descripcion), '') is null then raise exception 'Ingresá una descripción.'; end if;
  for l in select * from jsonb_array_elements(coalesce(p_lineas, '[]'::jsonb)) loop
    select es_control, nombre into v_control, v_nombre from public.cuentas where codigo = l->>'cuenta';
    if not found then raise exception 'La cuenta "%" no existe.', l->>'cuenta'; end if;
    if v_control then
      raise exception '"%" es una cuenta de control: solo se mueve con compras, ventas, cheques y pagos registrados.', v_nombre;
    end if;
    if round(coalesce((l->>'debe')::numeric,0),2) = 0 and round(coalesce((l->>'haber')::numeric,0),2) = 0 then continue; end if;
    v_debe  := v_debe  + round(coalesce((l->>'debe')::numeric, 0), 2);
    v_haber := v_haber + round(coalesce((l->>'haber')::numeric, 0), 2);
    v_n := v_n + 1;
  end loop;
  if v_n < 2 then raise exception 'El asiento necesita al menos dos líneas con importe.'; end if;
  if v_debe <> v_haber then raise exception 'El asiento no balancea: debe $% ≠ haber $%.', v_debe, v_haber; end if;
  return public._crear_asiento(p_fecha, trim(p_descripcion), 'manual', null, p_lineas);
end $$;

-- 6.8 Anulación con contraasiento (solo asientos manuales y de movimiento de fondos)
create function public.anular_asiento(p_asiento_id bigint, p_fecha date, p_motivo text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare a public.asientos%rowtype; v_lineas jsonb;
begin
  perform public._validar_fecha(p_fecha);
  select * into a from public.asientos where id = p_asiento_id;
  if not found then raise exception 'Asiento inexistente.'; end if;
  if a.origen not in ('manual','fondos') then
    raise exception 'Solo se pueden anular asientos manuales y de movimiento de fondos.';
  end if;
  if exists (select 1 from public.asientos where anula_asiento_id = a.id) then
    raise exception 'Ese asiento ya fue anulado.';
  end if;
  if p_fecha < a.fecha then raise exception 'La anulación no puede ser anterior al asiento original.'; end if;

  select jsonb_agg(jsonb_build_object('cuenta', c.codigo, 'debe', l.haber, 'haber', l.debe)) into v_lineas
  from public.asiento_lineas l join public.cuentas c on c.id = l.cuenta_id where l.asiento_id = a.id;

  return public._crear_asiento(p_fecha,
    format('Anulación del asiento Nº %s%s', a.numero, coalesce(': ' || nullif(trim(p_motivo), ''), '')),
    'anulacion', a.id, v_lineas, a.id);
end $$;

-- ---------------------------------------------------------------------
-- 7. SEGURIDAD: RLS + permisos (solo usuarios autenticados)
-- ---------------------------------------------------------------------

alter table public.empresa           enable row level security;
alter table public.cuentas           enable row level security;
alter table public.numeracion        enable row level security;
alter table public.asientos          enable row level security;
alter table public.asiento_lineas    enable row level security;
alter table public.clientes          enable row level security;
alter table public.proveedores       enable row level security;
alter table public.productos         enable row level security;
alter table public.stock_movimientos enable row level security;
alter table public.compras           enable row level security;
alter table public.compra_items      enable row level security;
alter table public.compra_pagos      enable row level security;
alter table public.ventas            enable row level security;
alter table public.venta_items       enable row level security;
alter table public.venta_pagos       enable row level security;
alter table public.facturas          enable row level security;

-- Lectura para el usuario autenticado
do $$
declare t text;
begin
  foreach t in array array['empresa','cuentas','asientos','asiento_lineas','clientes','proveedores','productos',
                           'stock_movimientos','compras','compra_items','compra_pagos','ventas','venta_items',
                           'venta_pagos','facturas']
  loop
    execute format('create policy "leer_%1$s" on public.%1$I for select to authenticated using (true)', t);
  end loop;
end $$;

-- Escritura directa SOLO en maestros (el resto se escribe únicamente con las funciones de arriba)
create policy "clientes_alta"      on public.clientes    for insert to authenticated with check (true);
create policy "clientes_edicion"   on public.clientes    for update to authenticated using (true) with check (true);
create policy "proveedores_alta"   on public.proveedores for insert to authenticated with check (true);
create policy "proveedores_edicion" on public.proveedores for update to authenticated using (true) with check (true);
create policy "productos_alta"     on public.productos   for insert to authenticated with check (true);
create policy "productos_edicion"  on public.productos   for update to authenticated using (true) with check (true);
create policy "cuentas_alta"       on public.cuentas     for insert to authenticated with check (es_control = false);
create policy "empresa_edicion"    on public.empresa     for update to authenticated using (true) with check (true);

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
revoke select on public.numeracion from authenticated;
grant insert, update on public.clientes, public.proveedores, public.productos to authenticated;
grant insert on public.cuentas to authenticated;
grant update on public.empresa to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function
  public.registrar_apertura(date, jsonb),
  public.registrar_fondos(date, text, text, numeric, text),
  public.registrar_compra(date, bigint, text, jsonb),
  public.registrar_pago_proveedor(bigint, date, numeric, text),
  public.registrar_venta(date, bigint, jsonb, jsonb),
  public.cobrar_cheque(bigint, date),
  public.registrar_asiento_manual(date, text, jsonb),
  public.anular_asiento(bigint, date, text)
to authenticated;

notify pgrst, 'reload schema';
