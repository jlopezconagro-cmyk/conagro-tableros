-- =====================================================================
-- Tableros Conagro · esquema de base de datos para Supabase
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run.
-- Se puede volver a correr sin perder datos (solo crea lo que falta y
-- reemplaza funciones y reglas).
-- =====================================================================

-- ---------- Catálogo de sucursales ----------------------------------
-- clave = nombre en datos_macro_ventas; cartera = nombre en Cartera de clientes;
-- inventario = almacén en el análisis de inventario; destino = nombre en "Destino sugerido".
create table if not exists public.sucursales (
  clave      text primary key,
  nombre     text not null,
  cartera    text,
  inventario text,
  destino    text
);
insert into public.sucursales (clave, nombre, cartera, inventario, destino) values
  ('matriz_comitan',             'Matriz Comitán',             'Matriz',       'COMITAN',          'COMITAN'),
  ('central_de_abastos_comitan', 'Central de Abastos Comitán', 'Central',      'SUC PANTEON',      'SUC PANTEON'),
  ('ruta_comitan',               'Ruta Comitán',               'Ruta Comitan', 'RUTA COMITAN',     'RUTA COMITAN'),
  ('tuxtla',                     'Tuxtla',                     'Tuxtla',       'TUXTLA GUTIERREZ', 'TUXTLA'),
  ('ruta_tuxtla',                'Ruta Tuxtla',                'Ruta Tuxtla',  'RUTA TUXTLA',      'RUTA TUXTLA'),
  ('tapachula',                  'Tapachula',                  'Tapachula',    'TAPACHULA',        'TAPACHULA'),
  ('cintalapa',                  'Cintalapa',                  'Cintalapa',    'CINTALAPA',        'CINTALAPA'),
  ('villaflores',                'Villaflores',                'Villaflores',  'VILLAFLORES',      'VILLAFLORES'),
  ('triunfo_independencia',      'Triunfo Independencia',      'Triunfo',      'TRIUNFO',          'TRIUNFO'),
  ('merida',                     'Mérida',                     'Merida',       'MERIDA',           'MERIDA')
on conflict (clave) do nothing;

-- ---------- Perfiles de usuario --------------------------------------
create table if not exists public.perfiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  nombre     text,
  rol        text not null default 'pendiente' check (rol in ('direccion', 'vendedor', 'pendiente')),
  sucursales text[] not null default '{}',
  activo     boolean not null default true,
  creado     timestamptz not null default now()
);

-- Cada usuario nuevo de Supabase recibe un perfil "pendiente" (sin acceso a datos)
create or replace function public.nuevo_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (user_id, email) values (new.id, new.email) on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.nuevo_perfil();
-- perfiles de usuarios que ya existían antes de correr este script
insert into public.perfiles (user_id, email) select id, email from auth.users on conflict (user_id) do nothing;

-- ---------- Funciones de permisos ------------------------------------
create or replace function public.es_direccion() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where user_id = auth.uid() and rol = 'direccion' and activo)
$$;
create or replace function public.mis_sucursales() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce((select sucursales from perfiles where user_id = auth.uid() and activo and rol = 'vendedor'), '{}')
$$;
create or replace function public.mis_almacenes() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(inventario), '{}') from sucursales where clave = any (mis_sucursales()) and inventario is not null
$$;

-- ---------- Datos -----------------------------------------------------
create table if not exists public.cartera_facturas (
  id            bigserial primary key,
  fecha_informe date not null,
  empresa       text,
  folio         text,
  sucursal      text,
  suc_clave     text,
  fecha_factura date,
  cve           bigint,
  cliente       text,
  saldo         numeric,
  bucket        smallint,
  fecha_venc    date,
  total         numeric,
  limite        numeric
);
create index if not exists cartera_suc_idx on public.cartera_facturas (suc_clave);

create table if not exists public.cartera_estatus (
  cliente     text primary key,
  estatus     text not null check (estatus in ('', 'Cobrar', 'Buscar', 'Convenio', 'Propuesto incobrable', 'Incobrable')),
  por         uuid default auth.uid(),
  actualizado timestamptz not null default now()
);

create table if not exists public.ventas_mensual (
  anio        int  not null,
  mes         int  not null,
  suc_clave   text not null,
  venta       numeric,
  meta        numeric,
  gasto_op    numeric,
  comisiones  numeric,
  gasto_total numeric,
  objetivo    numeric,
  primary key (anio, mes, suc_clave)
);

-- documentos completos de Dirección: 'finanzas' y 'resultados'
create table if not exists public.documentos (
  tipo        text primary key,
  datos       jsonb not null,
  archivo     text,
  actualizado timestamptz not null default now()
);

create table if not exists public.inv_informes (
  fecha       date primary key,
  resumen     jsonb not null,
  archivo     text,
  actualizado timestamptz not null default now()
);
create table if not exists public.inv_alertas (
  fecha date not null, linea text, clave text, descripcion text, existencia numeric, ventas_mes numeric,
  cobertura numeric, rop numeric, eoq numeric, urgencia text, precio numeric, almacenes text[]
);
create index if not exists inv_alertas_f on public.inv_alertas (fecha);
create table if not exists public.inv_detalle (
  fecha date not null, almacen text, linea text, clave text, descripcion text, clasif text, existencia numeric,
  costo numeric, valor numeric, cobertura numeric, ultima_venta text, precio numeric, precio_liq numeric
);
create index if not exists inv_detalle_f on public.inv_detalle (fecha, almacen);
create table if not exists public.inv_cedis (
  fecha date not null, cedis text, linea text, clave text, descripcion text, existencia numeric, valor numeric,
  dias numeric, ultimo_traspaso text, destino text, precio numeric
);
create index if not exists inv_cedis_f on public.inv_cedis (fecha, destino);
create table if not exists public.inv_respuestas (
  fecha       date not null,
  cedis       text not null,
  clave       text not null,
  suc_clave   text not null,
  respuesta   text not null check (respuesta in ('si', 'no')),
  por         uuid default auth.uid(),
  actualizado timestamptz not null default now(),
  primary key (fecha, cedis, clave, suc_clave)
);

-- ---------- Seguridad por fila (RLS) ---------------------------------
alter table public.sucursales       enable row level security;
alter table public.perfiles         enable row level security;
alter table public.cartera_facturas enable row level security;
alter table public.cartera_estatus  enable row level security;
alter table public.ventas_mensual   enable row level security;
alter table public.documentos       enable row level security;
alter table public.inv_informes     enable row level security;
alter table public.inv_alertas      enable row level security;
alter table public.inv_detalle      enable row level security;
alter table public.inv_cedis        enable row level security;
alter table public.inv_respuestas   enable row level security;

do $$ declare p record; begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' and tablename in
    ('sucursales','perfiles','cartera_facturas','cartera_estatus','ventas_mensual','documentos','inv_informes','inv_alertas','inv_detalle','inv_cedis','inv_respuestas')
  loop execute format('drop policy %I on public.%I', p.policyname, p.tablename); end loop;
end $$;

-- catálogo: lo leen todos los usuarios con sesión; solo Dirección lo cambia
create policy suc_leer on public.sucursales for select to authenticated using (true);
create policy suc_dir  on public.sucursales for all to authenticated using (es_direccion()) with check (es_direccion());

-- perfiles: cada quien ve el suyo; Dirección ve y edita todos
create policy per_leer on public.perfiles for select to authenticated using (user_id = auth.uid() or es_direccion());
create policy per_dir  on public.perfiles for update to authenticated using (es_direccion()) with check (es_direccion());

-- cartera: Dirección todo; vendedor solo las facturas de sus sucursales
create policy car_leer on public.cartera_facturas for select to authenticated
  using (es_direccion() or suc_clave = any (mis_sucursales()));

-- estatus de cobranza: el vendedor marca seguimiento o propone; solo Dirección confirma o quita "Incobrable"
create policy est_leer on public.cartera_estatus for select to authenticated using (
  es_direccion() or exists (select 1 from cartera_facturas f where f.cliente = cartera_estatus.cliente and f.suc_clave = any (mis_sucursales())));
create policy est_nuevo on public.cartera_estatus for insert to authenticated with check (
  es_direccion() or (estatus <> 'Incobrable' and exists (select 1 from cartera_facturas f where f.cliente = cartera_estatus.cliente and f.suc_clave = any (mis_sucursales()))));
create policy est_cambio on public.cartera_estatus for update to authenticated
  using (es_direccion() or (estatus <> 'Incobrable' and exists (select 1 from cartera_facturas f where f.cliente = cartera_estatus.cliente and f.suc_clave = any (mis_sucursales()))))
  with check (es_direccion() or (estatus <> 'Incobrable' and exists (select 1 from cartera_facturas f where f.cliente = cartera_estatus.cliente and f.suc_clave = any (mis_sucursales()))));

-- ventas en pesos, finanzas, resultados e inventario con costos: solo Dirección
create policy ven_dir on public.ventas_mensual for select to authenticated using (es_direccion());
create policy doc_dir on public.documentos     for select to authenticated using (es_direccion());
create policy inf_dir on public.inv_informes   for select to authenticated using (es_direccion());
create policy det_dir on public.inv_detalle    for select to authenticated using (es_direccion());
create policy ced_dir on public.inv_cedis      for select to authenticated using (es_direccion());

-- alertas de reorden: no traen costos; el vendedor ve las de productos que hay en su almacén
create policy ale_leer on public.inv_alertas for select to authenticated
  using (es_direccion() or almacenes && mis_almacenes());

-- respuestas a sugerencias del CEDIS
create policy res_leer  on public.inv_respuestas for select to authenticated using (es_direccion() or suc_clave = any (mis_sucursales()));
create policy res_nueva on public.inv_respuestas for insert to authenticated with check (suc_clave = any (mis_sucursales()));
create policy res_camb  on public.inv_respuestas for update to authenticated using (suc_clave = any (mis_sucursales())) with check (suc_clave = any (mis_sucursales()));
create policy res_borra on public.inv_respuestas for delete to authenticated using (suc_clave = any (mis_sucursales()));

-- ---------- Funciones para vendedores (sin pesos ni costos) ----------
-- Mi meta: solo proporciones. r = venta/meta del mes, w = meta del mes / meta del año, g = venta / venta del mismo mes del año anterior
create or replace function public.mi_meta()
returns table (anio int, mes int, cerrado boolean, r numeric, w numeric, g numeric)
language sql stable security definer set search_path = public as $$
  with cer as (select distinct v.anio a, v.mes m from ventas_mensual v where coalesce(v.venta, 0) <> 0),
       x as (select v.anio a, v.mes m, sum(v.venta) venta, sum(v.meta) meta
             from ventas_mensual v where v.suc_clave = any (mis_sucursales()) group by v.anio, v.mes),
       t as (select x.a, sum(x.meta) meta_anual from x group by x.a)
  select x.a, x.m,
         exists (select 1 from cer where cer.a = x.a and cer.m = x.m),
         case when x.meta > 0 then x.venta / x.meta end,
         case when t.meta_anual > 0 then x.meta / t.meta_anual end,
         case when p.venta > 0 then x.venta / p.venta end
  from x join t on t.a = x.a left join x p on p.a = x.a - 1 and p.m = x.m
  order by 1, 2
$$;

create or replace function public.mi_inv_detalle()
returns table (fecha date, almacen text, linea text, clave text, descripcion text, clasif text, existencia numeric,
               cobertura numeric, ultima_venta text, precio numeric, precio_liq numeric)
language sql stable security definer set search_path = public as $$
  select d.fecha, d.almacen, d.linea, d.clave, d.descripcion, d.clasif, d.existencia, d.cobertura, d.ultima_venta, d.precio, d.precio_liq
  from inv_detalle d
  where d.fecha = (select max(i.fecha) from inv_informes i) and d.almacen = any (mis_almacenes())
$$;

create or replace function public.mis_sugerencias()
returns table (fecha date, cedis text, linea text, clave text, descripcion text, existencia numeric, dias numeric,
               ultimo_traspaso text, destino text, precio numeric)
language sql stable security definer set search_path = public as $$
  select c.fecha, c.cedis, c.linea, c.clave, c.descripcion, c.existencia, c.dias, c.ultimo_traspaso, c.destino, c.precio
  from inv_cedis c
  where c.fecha = (select max(i.fecha) from inv_informes i)
    and c.destino in (select s.destino from sucursales s where s.clave = any (mis_sucursales()))
$$;

create or replace function public.ultimo_informe_inv() returns date
language sql stable security definer set search_path = public as $$ select max(fecha) from inv_informes $$;

-- ---------- Carga de datos (solo Dirección, todo o nada) -------------
create or replace function public.cargar_cartera(filas jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not es_direccion() then raise exception 'Solo Dirección puede cargar datos'; end if;
  delete from cartera_facturas where true;
  insert into cartera_facturas (fecha_informe, empresa, folio, sucursal, suc_clave, fecha_factura, cve, cliente, saldo, bucket, fecha_venc, total, limite)
  select f.fecha_informe, f.empresa, f.folio, f.sucursal, s.clave, f.fecha_factura, f.cve, f.cliente, f.saldo, f.bucket, f.fecha_venc, f.total, f.limite
  from jsonb_to_recordset(filas) as f (fecha_informe date, empresa text, folio text, sucursal text, fecha_factura date, cve bigint,
                                       cliente text, saldo numeric, bucket smallint, fecha_venc date, total numeric, limite numeric)
  left join sucursales s on s.cartera = f.sucursal;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.cargar_ventas(filas jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not es_direccion() then raise exception 'Solo Dirección puede cargar datos'; end if;
  delete from ventas_mensual where true;
  insert into ventas_mensual (anio, mes, suc_clave, venta, meta, gasto_op, comisiones, gasto_total, objetivo)
  select anio, mes, suc_clave, sum(venta), sum(meta), sum(gasto_op), sum(comisiones), sum(gasto_total), sum(objetivo)
  from jsonb_to_recordset(filas) as f (anio int, mes int, suc_clave text, venta numeric, meta numeric, gasto_op numeric,
                                       comisiones numeric, gasto_total numeric, objetivo numeric)
  group by anio, mes, suc_clave;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.cargar_documento(p_tipo text, p_datos jsonb, p_archivo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not es_direccion() then raise exception 'Solo Dirección puede cargar datos'; end if;
  insert into documentos (tipo, datos, archivo, actualizado) values (p_tipo, p_datos, p_archivo, now())
  on conflict (tipo) do update set datos = excluded.datos, archivo = excluded.archivo, actualizado = now();
end $$;

create or replace function public.cargar_inventario(p_fecha date, p_resumen jsonb, p_alertas jsonb, p_detalle jsonb, p_cedis jsonb, p_archivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_direccion() then raise exception 'Solo Dirección puede cargar datos'; end if;
  delete from inv_alertas where fecha = p_fecha;
  delete from inv_detalle where fecha = p_fecha;
  delete from inv_cedis   where fecha = p_fecha;
  insert into inv_informes (fecha, resumen, archivo, actualizado) values (p_fecha, p_resumen, p_archivo, now())
  on conflict (fecha) do update set resumen = excluded.resumen, archivo = excluded.archivo, actualizado = now();
  insert into inv_alertas select p_fecha, a.linea, a.clave, a.descripcion, a.existencia, a.ventas_mes, a.cobertura, a.rop, a.eoq, a.urgencia, a.precio, a.almacenes
  from jsonb_to_recordset(p_alertas) as a (linea text, clave text, descripcion text, existencia numeric, ventas_mes numeric, cobertura numeric,
                                           rop numeric, eoq numeric, urgencia text, precio numeric, almacenes text[]);
  insert into inv_detalle select p_fecha, d.almacen, d.linea, d.clave, d.descripcion, d.clasif, d.existencia, d.costo, d.valor, d.cobertura, d.ultima_venta, d.precio, d.precio_liq
  from jsonb_to_recordset(p_detalle) as d (almacen text, linea text, clave text, descripcion text, clasif text, existencia numeric, costo numeric,
                                           valor numeric, cobertura numeric, ultima_venta text, precio numeric, precio_liq numeric);
  insert into inv_cedis select p_fecha, c.cedis, c.linea, c.clave, c.descripcion, c.existencia, c.valor, c.dias, c.ultimo_traspaso, c.destino, c.precio
  from jsonb_to_recordset(p_cedis) as c (cedis text, linea text, clave text, descripcion text, existencia numeric, valor numeric, dias numeric,
                                         ultimo_traspaso text, destino text, precio numeric);
end $$;

-- ---------- Permisos de acceso a la API ------------------------------
-- (el proyecto se creó sin exponer tablas automáticamente; aquí se abre solo lo necesario,
--  y las reglas de arriba deciden qué filas ve cada quien)
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant execute on function public.nuevo_perfil() to public;  -- la usa el alta de usuarios de Supabase
grant usage on schema public to authenticated;
grant select on public.sucursales, public.perfiles, public.cartera_facturas, public.cartera_estatus, public.ventas_mensual,
                public.documentos, public.inv_informes, public.inv_alertas, public.inv_detalle, public.inv_cedis, public.inv_respuestas to authenticated;
grant insert, update, delete on public.sucursales to authenticated;
grant update (nombre, rol, sucursales, activo) on public.perfiles to authenticated;
grant insert, update on public.cartera_estatus to authenticated;
grant insert, update, delete on public.inv_respuestas to authenticated;
grant execute on function public.es_direccion(), public.mis_sucursales(), public.mis_almacenes(), public.mi_meta(),
  public.mi_inv_detalle(), public.mis_sugerencias(), public.ultimo_informe_inv(), public.cargar_cartera(jsonb), public.cargar_ventas(jsonb),
  public.cargar_documento(text, jsonb, text), public.cargar_inventario(date, jsonb, jsonb, jsonb, jsonb, text) to authenticated;
