-- ============================================================================
--  CAPA DE CONSISTENCIA · tabla board_snapshots
-- ----------------------------------------------------------------------------
--  Cada REFRESH LIVE BOARD congela un snapshot INMUTABLE del tablero: el score
--  0-100 de cada mercado (juego y props), su status por histéresis (SEÑAL /
--  WATCHLIST / RECHAZADO), la huella de los inputs usados (cuotas, alineación,
--  abridor, clima, DQ) y el audit trail contra el snapshot anterior. La versión
--  de criterios (MLB-EDGE-v1.0) queda estampada en cada fila.
--
--  Es de solo-agregar (append-only): NUNCA se actualiza una fila. Cada id es un
--  snapshot distinto; el más reciente por game_date es el vigente. Así se puede
--  reconstruir el histórico y comprobar que los mismos datos daban lo mismo.
--
--  Lectura pública (la página muestra el tablero sin login). Escritura SOLO de
--  la lista de dueños (app_owners), igual que el resto de las tablas. Requiere
--  haber corrido antes rls-cerrar-escritura.sql (crea la función es_dueno()).
--
--  Idempotente: se puede correr las veces que haga falta.
-- ============================================================================

create table if not exists public.board_snapshots (
  id         text primary key,            -- SNAP-YYYYMMDD-HHMMSS-xxxx
  game_date  text not null,               -- fecha analizada (YYYY-MM-DD)
  criteria   text,                        -- versión de criterios (MLB-EDGE-v1.0)
  created_at timestamptz default now(),
  payload    text                         -- JSON: {id,date,criteria,createdAt,fps,rows[]}
);

-- El vigente de cada día es el más reciente: se consulta por (game_date, created_at).
create index if not exists board_snapshots_date_idx
  on public.board_snapshots (game_date, created_at desc);

alter table public.board_snapshots enable row level security;

-- Lectura pública.
drop policy if exists "snapshots public read" on public.board_snapshots;
create policy "snapshots public read"
  on public.board_snapshots for select using (true);

-- Escritura solo de dueños. Si es_dueno() todavía no existe (no corriste
-- rls-cerrar-escritura.sql), el bloque avisa en vez de reventar.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname='es_dueno') then
    drop policy if exists "snapshots owner write"  on public.board_snapshots;
    drop policy if exists "snapshots owner update" on public.board_snapshots;
    drop policy if exists "snapshots owner delete" on public.board_snapshots;
    create policy "snapshots owner write"  on public.board_snapshots
      for insert to authenticated with check (public.es_dueno());
    create policy "snapshots owner update" on public.board_snapshots
      for update to authenticated using (public.es_dueno()) with check (public.es_dueno());
    create policy "snapshots owner delete" on public.board_snapshots
      for delete to authenticated using (public.es_dueno());
    raise notice 'board_snapshots protegida: escritura solo de dueños.';
  else
    raise notice 'FALTA la función es_dueno(): corre primero rls-cerrar-escritura.sql y vuelve a correr esto.';
  end if;
end $$;

-- Comprobación: la escritura debe decir es_dueno(); la lectura, true.
select cmd, coalesce(qual, with_check) as condicion
  from pg_policies
 where schemaname='public' and tablename='board_snapshots'
 order by cmd;
