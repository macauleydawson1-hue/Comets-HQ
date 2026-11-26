alter table public.comets_player_benchmarks
  drop constraint comets_player_benchmarks_benchmark_check,
  drop constraint comets_player_benchmarks_check,
  add constraint comets_player_benchmarks_benchmark_check check (benchmark in ('bronco', 'run_4min', 'pushups', 'plank', 'sprint_40m')),
  add constraint comets_player_benchmarks_check check (
    (benchmark = 'pushups' and result = trunc(result))
    or (benchmark <> 'pushups' and result > 0)
  );
