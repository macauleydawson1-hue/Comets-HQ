create function comets_private.my_benchmarks()
returns table (benchmark text, result numeric, tested_on date, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select b.benchmark, b.result, b.tested_on, b.created_at
  from public.player_links l
  join public.user_roles r on r.user_id = l.user_id and r.role = 'player'
  join public.comets_player_benchmarks b on b.player_id = l.player_id
  where l.user_id = (select auth.uid());
$$;

revoke all on function comets_private.my_benchmarks() from public, anon, authenticated;
grant usage on schema comets_private to authenticated;
grant execute on function comets_private.my_benchmarks() to authenticated;

create function public.comets_my_benchmarks()
returns table (benchmark text, result numeric, tested_on date, created_at timestamptz)
language sql stable security invoker set search_path = ''
as $$
  select * from comets_private.my_benchmarks()
  order by tested_on desc, created_at desc;
$$;

revoke all on function public.comets_my_benchmarks() from public, anon, authenticated;
grant execute on function public.comets_my_benchmarks() to authenticated;
