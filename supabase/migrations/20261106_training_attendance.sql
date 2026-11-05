-- One coach-only register per local training date. Existing sessions are untouched.
begin;
create table if not exists public.comets_training_days (
 id uuid primary key default gen_random_uuid(),
 attendance_date date not null unique,
 title text not null default 'Team training',
 revision integer not null default 0,
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
create table if not exists public.comets_training_attendance (
 day_id uuid not null references public.comets_training_days(id) on delete cascade,
 player_id uuid not null references public.squad_players(id),
 status text not null check(status in ('present','absent','excused','unmarked')),
 primary key(day_id,player_id)
);
alter table public.comets_training_days enable row level security;
alter table public.comets_training_attendance enable row level security;
revoke all on public.comets_training_days,public.comets_training_attendance from public,anon,authenticated;
grant select on public.comets_training_days,public.comets_training_attendance to authenticated;
drop policy if exists attendance_days_coach_read on public.comets_training_days;
create policy attendance_days_coach_read on public.comets_training_days for select to authenticated using(comets_private.is_coach());
drop policy if exists attendance_marks_coach_read on public.comets_training_attendance;
create policy attendance_marks_coach_read on public.comets_training_attendance for select to authenticated using(comets_private.is_coach());

create or replace function public.comets_save_attendance(p_day date,p_title text,p_revision integer,p_marks jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.comets_training_days;
begin
 if auth.uid() is null or comets_private.is_coach() is not true then raise exception 'Coach access is required'; end if;
 if p_day is null or p_revision is null or p_revision<0 or p_title is null or length(trim(p_title)) not between 1 and 120 then raise exception 'Choose a training date and title'; end if;
 if p_marks is null or jsonb_typeof(p_marks)<>'array' then raise exception 'Invalid attendance list'; end if;
 if jsonb_array_length(p_marks)>300 then raise exception 'Attendance list is too large'; end if;
 if exists(select 1 from jsonb_to_recordset(p_marks) as m(player_id uuid,status text) where player_id is null or status is null or status not in ('present','absent','excused','unmarked')) then raise exception 'Invalid attendance status'; end if;
 if (select count(*) from jsonb_to_recordset(p_marks) as m(player_id uuid,status text))<>(select count(distinct player_id) from jsonb_to_recordset(p_marks) as m(player_id uuid,status text)) then raise exception 'Duplicate players in attendance'; end if;
 -- Archived players remain in saved history but cannot receive new marks.
 if exists(select 1 from jsonb_to_recordset(p_marks) as m(player_id uuid,status text) where not exists(select 1 from public.squad_players s where s.id=m.player_id and s.active)) then raise exception 'The squad has changed. Reload the register before saving'; end if;
 insert into public.comets_training_days(attendance_date,title) values(p_day,trim(p_title)) on conflict(attendance_date) do nothing;
 select * into d from public.comets_training_days where attendance_date=p_day for update;
 if d.revision<>p_revision then raise exception 'Another coach has updated this register. Reload before saving'; end if;
 insert into public.comets_training_attendance(day_id,player_id,status)
 select d.id,m.player_id,m.status from jsonb_to_recordset(p_marks) as m(player_id uuid,status text)
 on conflict(day_id,player_id) do update set status=excluded.status;
 update public.comets_training_days set title=trim(p_title),revision=revision+1,updated_by=auth.uid(),updated_at=now() where id=d.id returning * into d;
 return jsonb_build_object('id',d.id,'revision',d.revision,'updated_at',d.updated_at);
end;
$$;
revoke all on function public.comets_save_attendance(date,text,integer,jsonb) from public,anon;
grant execute on function public.comets_save_attendance(date,text,integer,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
