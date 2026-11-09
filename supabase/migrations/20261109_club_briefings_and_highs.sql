-- Coach/player account links, opposition briefings and in-app achievements.
-- Run the full script once in the existing project. No passwords or tokens required.
begin;
alter table public.match_stats add column if not exists hitups integer check(hitups>=0);
create table if not exists public.comets_opponent_notes(
 opponent_key text primary key,opponent_name text not null,
 strengths text not null default '',weaknesses text not null default '',priorities text not null default '',video_url text not null default '',updated_at timestamptz not null default now()
);
create table if not exists public.comets_briefing_drafts(
 fixture_id uuid primary key references public.fixtures(id) on delete cascade,
 strengths text not null default '',weaknesses text not null default '',priorities text not null default '',video_url text not null default '',revision integer not null default 0,updated_at timestamptz not null default now()
);
create table if not exists public.comets_published_briefings(
 fixture_id uuid primary key references public.fixtures(id) on delete cascade,
 strengths text not null,weaknesses text not null,priorities text not null,video_url text not null default '',published_at timestamptz not null default now()
);
create table if not exists public.comets_notifications(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 source_key text not null,kind text not null check(kind in ('briefing','personal_best')),
 title text not null,body text not null,fixture_id uuid references public.fixtures(id) on delete cascade,
 player_id uuid references public.squad_players(id),metric text,season integer,
 read_at timestamptz,created_at timestamptz not null default now(),unique(user_id,source_key)
);
create index if not exists notification_inbox on public.comets_notifications(user_id,created_at desc);
alter table public.comets_opponent_notes enable row level security;
alter table public.comets_briefing_drafts enable row level security;
alter table public.comets_published_briefings enable row level security;
alter table public.comets_notifications enable row level security;
revoke all on public.comets_opponent_notes,public.comets_briefing_drafts,public.comets_published_briefings,public.comets_notifications from public,anon,authenticated;
grant select on public.comets_opponent_notes,public.comets_briefing_drafts,public.comets_published_briefings,public.comets_notifications to authenticated;
grant update(read_at) on public.comets_notifications to authenticated;
drop policy if exists opponent_notes_coach on public.comets_opponent_notes;
create policy opponent_notes_coach on public.comets_opponent_notes for select to authenticated using(comets_private.is_coach());
drop policy if exists briefing_draft_coach on public.comets_briefing_drafts;
create policy briefing_draft_coach on public.comets_briefing_drafts for select to authenticated using(comets_private.is_coach());
drop policy if exists published_briefing_members on public.comets_published_briefings;
create policy published_briefing_members on public.comets_published_briefings for select to authenticated using(exists(select 1 from public.user_roles where user_id=auth.uid() and role in ('coach','player')));
drop policy if exists own_notification_read on public.comets_notifications;
create policy own_notification_read on public.comets_notifications for select to authenticated using(user_id=auth.uid() and exists(select 1 from public.user_roles where user_id=auth.uid()) and (kind<>'personal_best' or exists(select 1 from public.player_links l where l.user_id=auth.uid() and l.player_id=comets_notifications.player_id)));
drop policy if exists own_notification_update on public.comets_notifications;
create policy own_notification_update on public.comets_notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

-- Link existing coach/player accounts without changing their role or password.
-- All app-side linking now goes through this checked function.
revoke insert,update,delete on public.player_links from authenticated;
create or replace function public.comets_link_member(p_email text,p_player uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare member_id uuid; member_role text;
begin
 if auth.uid() is null or comets_private.is_coach() is not true then raise exception 'Coach access required'; end if;
 select id into member_id from auth.users where lower(email)=lower(trim(p_email));
 if member_id is null then raise exception 'Account not found. Activate the account first'; end if;
 select role into member_role from public.user_roles where user_id=member_id;
 if member_role is null or member_role not in ('coach','player') then raise exception 'Member has no valid club role'; end if;
 if p_player is null and member_role='player' then raise exception 'A player account must remain linked to a squad player'; end if;
 if p_player is not null then
  perform 1 from public.squad_players where id=p_player and active for update;
  if not found then raise exception 'Choose an active squad player'; end if;
  if exists(select 1 from public.player_links where player_id=p_player and user_id<>member_id) then raise exception 'That squad player is linked to another account'; end if;
 end if;
 delete from public.player_links where user_id=member_id;
 if p_player is not null then insert into public.player_links(user_id,player_id) values(member_id,p_player); end if;
 return jsonb_build_object('user_id',member_id,'player_id',p_player,'role',member_role);
end; $$;
revoke all on function public.comets_link_member(text,uuid) from public,anon;
grant execute on function public.comets_link_member(text,uuid) to authenticated;

create or replace function public.comets_save_briefing(p_fixture uuid,p_strengths text,p_weaknesses text,p_priorities text,p_video text,p_revision integer,p_action text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.fixtures; d public.comets_briefing_drafts; old_public public.comets_published_briefings; changed boolean; v_opponent_key text;
begin
 if auth.uid() is null or comets_private.is_coach() is not true then raise exception 'Coach access required'; end if;
 if p_action is null or p_action not in ('save','publish','unpublish') or p_revision is null then raise exception 'Invalid action'; end if;
 if p_strengths is null or p_weaknesses is null or p_priorities is null or p_video is null or length(p_strengths)>1000 or length(p_weaknesses)>1000 or length(p_priorities)>1000 or length(p_video)>500 then raise exception 'Keep notes concise: maximum 1,000 characters per section'; end if;
 if p_action='publish' and length(trim(p_priorities))=0 then raise exception 'Add at least one team priority before publishing'; end if;
 select * into f from public.fixtures where id=p_fixture for update;
 if not found then raise exception 'Fixture no longer exists'; end if;
 insert into public.comets_briefing_drafts(fixture_id) values(p_fixture) on conflict do nothing;
 select * into d from public.comets_briefing_drafts where fixture_id=p_fixture for update;
 if d.revision<>p_revision then raise exception 'Another coach updated this briefing. Reload before saving'; end if;
 update public.comets_briefing_drafts set strengths=p_strengths,weaknesses=p_weaknesses,priorities=p_priorities,video_url=p_video,revision=revision+1,updated_at=now() where fixture_id=p_fixture returning * into d;
 v_opponent_key=lower(regexp_replace(trim(f.opponent),'[[:space:]]+',' ','g'));
 insert into public.comets_opponent_notes(opponent_key,opponent_name,strengths,weaknesses,priorities,video_url)
 values(v_opponent_key,f.opponent,p_strengths,p_weaknesses,p_priorities,p_video)
 on conflict(opponent_key) do update set strengths=excluded.strengths,weaknesses=excluded.weaknesses,priorities=excluded.priorities,video_url=excluded.video_url,updated_at=now();
 if p_action='publish' then
  select * into old_public from public.comets_published_briefings where fixture_id=p_fixture;
  changed=not found or row(old_public.strengths,old_public.weaknesses,old_public.priorities,old_public.video_url) is distinct from row(p_strengths,p_weaknesses,p_priorities,p_video);
  insert into public.comets_published_briefings(fixture_id,strengths,weaknesses,priorities,video_url) values(p_fixture,p_strengths,p_weaknesses,p_priorities,p_video)
  on conflict(fixture_id) do update set strengths=excluded.strengths,weaknesses=excluded.weaknesses,priorities=excluded.priorities,video_url=excluded.video_url,published_at=now();
  if changed then
   insert into public.comets_notifications(user_id,source_key,kind,title,body,fixture_id)
   select user_id,'briefing:'||p_fixture::text,'briefing','Match briefing ready','Comets vs '||f.opponent||' · '||f.match_date::text,p_fixture from public.user_roles where role in ('coach','player')
   on conflict(user_id,source_key) do update set title=excluded.title,body=excluded.body,read_at=null,created_at=now();
  end if;
 elsif p_action='unpublish' then
  delete from public.comets_published_briefings where fixture_id=p_fixture;
  delete from public.comets_notifications where kind='briefing' and fixture_id=p_fixture;
 end if;
 return jsonb_build_object('revision',d.revision,'published',exists(select 1 from public.comets_published_briefings where fixture_id=p_fixture));
end; $$;
revoke all on function public.comets_save_briefing(uuid,text,text,text,text,integer,text) from public,anon;
grant execute on function public.comets_save_briefing(uuid,text,text,text,text,integer,text) to authenticated;

-- Notifications are generated from official stats in the database, never by clients.
-- Only a strict improvement over an earlier match qualifies. The first match is a baseline.
create or replace function public.comets_refresh_highs(p_player uuid,p_season integer,p_touched uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare key text;r record;label text;
begin
 if p_season is null then return;end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comets-pb:'||p_player::text||':'||p_season::text,0));
 foreach key in array array['tries','tackles','metres','hitups'] loop
  label=case key when 'hitups' then 'hit-ups' else key end;
  with ranked as (
   select f.id,(to_jsonb(s)->>key)::numeric score,
   max((to_jsonb(s)->>key)::numeric) over(order by f.match_date,f.id rows between unbounded preceding and 1 preceding) previous
   from public.match_stats s join public.fixtures f on f.id=s.fixture_id where s.player_id=p_player and extract(year from f.match_date)=p_season
  ) delete from public.comets_notifications n where n.kind='personal_best' and n.player_id=p_player and n.season=p_season and n.metric=key
   and not exists(select 1 from ranked ranked_row where ranked_row.id=n.fixture_id and ranked_row.previous is not null and ranked_row.score>ranked_row.previous);
  for r in with ranked as (
   select f.id,(to_jsonb(s)->>key)::numeric score,
   max((to_jsonb(s)->>key)::numeric) over(order by f.match_date,f.id rows between unbounded preceding and 1 preceding) previous
   from public.match_stats s join public.fixtures f on f.id=s.fixture_id where s.player_id=p_player and extract(year from f.match_date)=p_season
  ) select * from ranked where previous is not null and score>previous loop
   insert into public.comets_notifications(user_id,source_key,kind,title,body,fixture_id,player_id,metric,season)
   select l.user_id,'pb:'||p_player::text||':'||p_season::text||':'||key||':'||r.id::text,'personal_best',
    'New season high: '||r.score::text||' '||label,r.score::text||' '||label||' in one match · '||p_season::text,r.id,p_player,key,p_season
   from public.player_links l where l.player_id=p_player and (r.id=p_touched or exists(select 1 from public.comets_notifications n where n.user_id=l.user_id and n.player_id=p_player and n.fixture_id=r.id and n.metric=key and n.season=p_season))
   on conflict(user_id,source_key) do update set title=excluded.title,body=excluded.body;
  end loop;
 end loop;
end; $$;
revoke all on function public.comets_refresh_highs(uuid,integer,uuid) from public,anon,authenticated;
create or replace function public.comets_stats_highs_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
declare year_value integer;
begin
 if TG_OP in ('UPDATE','DELETE') then
  select extract(year from match_date)::integer into year_value from public.fixtures where id=OLD.fixture_id;
  perform public.comets_refresh_highs(OLD.player_id,year_value,null);
 end if;
 if TG_OP in ('INSERT','UPDATE') then
  select extract(year from match_date)::integer into year_value from public.fixtures where id=NEW.fixture_id;
  perform public.comets_refresh_highs(NEW.player_id,year_value,NEW.fixture_id);
 end if;
 return null;
end; $$;
revoke all on function public.comets_stats_highs_trigger() from public,anon,authenticated;
drop trigger if exists comets_match_highs on public.match_stats;
create trigger comets_match_highs after insert or update or delete on public.match_stats for each row execute function public.comets_stats_highs_trigger();
create or replace function public.comets_fixture_highs_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
declare p record;
begin
 if OLD.match_date is distinct from NEW.match_date then
  for p in select distinct player_id from public.match_stats where fixture_id=NEW.id loop
   perform public.comets_refresh_highs(p.player_id,extract(year from OLD.match_date)::integer,null);
   perform public.comets_refresh_highs(p.player_id,extract(year from NEW.match_date)::integer,null);
  end loop;
 end if;return null;
end; $$;
revoke all on function public.comets_fixture_highs_trigger() from public,anon,authenticated;
drop trigger if exists comets_fixture_highs on public.fixtures;
create trigger comets_fixture_highs after update of match_date on public.fixtures for each row execute function public.comets_fixture_highs_trigger();
create or replace function public.comets_unread_count()
returns bigint language sql security invoker set search_path='' as $$ select count(*) from public.comets_notifications where user_id=auth.uid() and read_at is null $$;
revoke all on function public.comets_unread_count() from public,anon;
grant execute on function public.comets_unread_count() to authenticated;
commit;
