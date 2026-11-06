-- Coach-recorded player benchmarks. Personal browser logs are not migrated.
begin;
create table if not exists public.comets_player_benchmarks (
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references public.squad_players(id),
 benchmark text not null check(benchmark in ('bench_press','squat','trap_bar','bronco','sprint_100m','pushups_1min','plank','situps_1min')),
 result numeric(12,2) not null check(result>=0 and result<=86400),
 tested_on date not null,
 notes text not null default '' check(length(notes)<=500),
 recorded_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 check ((benchmark in ('pushups_1min','situps_1min') and result=trunc(result)) or (benchmark not in ('pushups_1min','situps_1min') and result>0))
);
create index if not exists player_benchmark_history on public.comets_player_benchmarks(player_id,tested_on desc,created_at desc);
alter table public.comets_player_benchmarks enable row level security;
revoke all on public.comets_player_benchmarks from public,anon,authenticated;
grant select,insert,update,delete on public.comets_player_benchmarks to authenticated;
drop policy if exists player_benchmarks_coach_read on public.comets_player_benchmarks;
create policy player_benchmarks_coach_read on public.comets_player_benchmarks for select to authenticated using(comets_private.is_coach());
drop policy if exists player_benchmarks_coach_insert on public.comets_player_benchmarks;
create policy player_benchmarks_coach_insert on public.comets_player_benchmarks for insert to authenticated with check(comets_private.is_coach() and recorded_by=auth.uid() and exists(select 1 from public.squad_players where id=player_id and active));
drop policy if exists player_benchmarks_coach_update on public.comets_player_benchmarks;
create policy player_benchmarks_coach_update on public.comets_player_benchmarks for update to authenticated using(comets_private.is_coach()) with check(comets_private.is_coach());
drop policy if exists player_benchmarks_coach_delete on public.comets_player_benchmarks;
create policy player_benchmarks_coach_delete on public.comets_player_benchmarks for delete to authenticated using(comets_private.is_coach());
notify pgrst,'reload schema';
commit;
