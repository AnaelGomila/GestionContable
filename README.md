# Gestor contable · Ergo Oficinas S.R.L.

Mini sistema contable con partida doble para una empresa de **muebles de oficina**.
Stack: **React + Vite** (frontend) · **Supabase** (PostgreSQL + Auth) · `@react-pdf/renderer` (facturas en PDF).

Cada operación (compra, venta, fondos, cobro de cheque, pago a proveedor) genera **su propio asiento contable**
y mueve el stock en una única transacción de base de datos.

---

## 1. Puesta en marcha

1. **Supabase**: creá un proyecto nuevo.
2. **SQL Editor → New query**: pegá y ejecutá, en este orden,
   `supabase/01_schema.sql` y después `supabase/02_seed.sql`.
3. **Authentication → Users → Add user → Create new user**: cargá un email y una contraseña
   y tildá **Auto Confirm User**. Ese es el único usuario (admin); el sistema no tiene registro.
4. Copiá `.env.example` a `.env` y completá la URL del proyecto y la clave **anon/publishable**
   (Project Settings → API). Nunca uses la `service_role` en el frontend.
5. `npm install` y `npm run dev`.

## 2. Recorrido para la demo

1. **Empresa y capital** → repartir el capital de $20.000.000 y *Registrar apertura*
   (Mercaderías se calcula sola con el stock inicial: $10.000.000).
2. **Fondos** → reorganizar el capital (por ejemplo Banco → Muebles y útiles).
3. **Compras** → comprarle al proveedor (queda en *Proveedores*). Opcional: **Pagar**.
4. **Ventas** → vender a *Consultora Andina S.A.* (**Factura A**), por ejemplo 50 % cheque al día y 50 % cheque diferido.
5. **Ventas** → vender a *Lucía Fernández* (**Factura B**) en efectivo, o combinando medios.
6. **Facturas** → ver y **descargar el PDF**.
7. **Cheques diferidos** → cobrar el cheque pendiente.
8. **Libro diario / mayor / balance / situación patrimonial** y el **control de la ecuación patrimonial** en *Inicio*.

## 3. Estructura del proyecto

```
supabase/            01_schema.sql (tablas, funciones, RLS)  ·  02_seed.sql (datos inventados)
src/
  pages/             una por pantalla (Dashboard, Ventas, LibroDiario, …)
  components/        layout/, ui/, asientos/, facturas/, operaciones/, dashboard/, terceros/
  services/          llamadas a Supabase, un archivo por módulo
  context/           sesión (AuthContext) y plan de cuentas (CuentasContext)
  hooks/             useAsync
  lib/               formatos es-AR, IVA, armado de asientos para la vista previa
  routes/            ProtectedRoute (sin sesión → /login)
  styles/            global.css
```

## 4. Decisiones de diseño (para la defensa)

| Tema | Cómo se resuelve |
|---|---|
| **Partida doble** | `asiento_lineas` + *constraint trigger* diferido: al cerrar la transacción cada asiento debe tener ≥ 2 líneas y debe = haber. Además `check` por línea (no negativos, no debe y haber a la vez). |
| **Saldos** | No se guardan. La vista `v_saldos` suma `asiento_lineas`. Nadie puede "editar un saldo". |
| **Stock** | No se guarda. La vista `v_stock` suma `stock_movimientos` (cada compra suma, cada venta resta). |
| **Inmutabilidad** | Triggers que impiden `UPDATE`/`DELETE`/`TRUNCATE` sobre asientos, líneas, movimientos de stock y facturas. Los errores se corrigen con un **contraasiento** (`anular_asiento`). |
| **Atomicidad** | Cada operación es una función PL/pgSQL (`registrar_venta`, …) llamada con `supabase.rpc`: documento + asiento + stock + factura, todo o nada. |
| **Seguridad** | RLS activado en todas las tablas; solo usuarios autenticados. El frontend solo puede escribir directamente en maestros (clientes, proveedores, productos, cuentas nuevas); lo contable solo entra por las funciones. |
| **Cuentas de control** | *Mercaderías*, *Cheques diferidos a cobrar* y *Proveedores* no se tocan con asientos manuales: su saldo debe coincidir con el stock, los cheques pendientes y las compras impagas. La vista `v_controles` lo verifica. |
| **Ecuación patrimonial** | Activo = Pasivo + Patrimonio neto + Resultado, visible y verificada en *Inicio* y en *Situación patrimonial*. |
| **Factura A / B** | La condición IVA del cliente decide el tipo. Numeración correlativa sin saltos por tipo (0001-00000001…) usando una tabla de contadores dentro de la transacción. La factura guarda una copia de los datos del emisor y del receptor. |
| **Costo de lo vendido** | Costo fijo por producto: cada venta registra Debe CMV / Haber Mercaderías por `cantidad × costo`. |
| **Medios de pago** | Una venta puede combinar varios: efectivo (Caja), transferencia y cheque al día (Banco), cheque diferido (Cheques diferidos a cobrar → al cobrarlo pasa a Banco). |

## 5. Asientos que genera cada operación

- **Apertura**: Debe Caja, Banco, Muebles, Equipos, Mercaderías · Haber Capital social.
- **Fondos**: Debe destino · Haber origen.
- **Compra**: Debe Mercaderías (neto) + IVA crédito fiscal · Haber Proveedores (total).
- **Pago a proveedor**: Debe Proveedores · Haber Caja o Banco.
- **Venta**: Debe Caja / Banco / Cheques diferidos (según el cobro) + Costo de mercaderías vendidas · Haber Ventas (neto) + IVA débito fiscal + Mercaderías (costo).
- **Cobro de cheque**: Debe Banco · Haber Cheques diferidos a cobrar.
- **Manual**: lo que cargues, siempre balanceado. **Anulación**: el mismo asiento con debe y haber invertidos.

## 6. Simplificaciones (se pueden mencionar como mejoras futuras)

Solo una empresa y un usuario · IVA 21 % y 10,5 % · costo fijo por producto (no promedio ponderado) ·
las compras y ventas no se anulan (haría falta nota de crédito y reversión de stock) ·
sin cierre de ejercicio · el CAE y el QR de las facturas son simulados (no hay conexión con ARCA).

## 7. Datos inventados

Empresa, proveedor, clientes y productos del `02_seed.sql` son ficticios; los CUIT tienen dígito verificador válido pero no
pertenecen a nadie. Se pueden cambiar en el SQL o desde la app.
