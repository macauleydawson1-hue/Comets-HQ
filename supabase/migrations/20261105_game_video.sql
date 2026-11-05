-- Private game clips: coaches manage drafts; signed-in members view published clips.
begin;
create table if not exists public.comets_game_videos (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(trim(title)) between 1 and 120),
 game_week text not null check (length(trim(game_week)) between 1 and 100),
 match_date date,
 analysis text not null default '' check (length(analysis)<=10000),
 object_path text not null unique,
 published boolean not null default false,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.comets_game_videos enable row level security;
revoke all on public.comets_game_videos from public,anon;
grant select,insert,update,delete on public.comets_game_videos to authenticated;
drop policy if exists game_video_read on public.comets_game_videos;
create policy game_video_read on public.comets_game_videos for select to authenticated
 using (comets_private.is_coach() or (published and exists(select 1 from public.user_roles where user_id=auth.uid() and role in ('coach','player'))));
drop policy if exists game_video_create on public.comets_game_videos;
create policy game_video_create on public.comets_game_videos for insert to authenticated
 with check (comets_private.is_coach() and created_by=auth.uid() and object_path like auth.uid()::text || '/%');
drop policy if exists game_video_edit on public.comets_game_videos;
create policy game_video_edit on public.comets_game_videos for update to authenticated
 using (comets_private.is_coach()) with check (comets_private.is_coach());
drop policy if exists game_video_delete on public.comets_game_videos;
create policy game_video_delete on public.comets_game_videos for delete to authenticated
 using (comets_private.is_coach());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('comets-game-video','comets-game-video',false,52428800,array['video/mp4','video/webm','video/quicktime'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists game_video_files_read on storage.objects;
create policy game_video_files_read on storage.objects for select to authenticated
 using (bucket_id='comets-game-video' and (comets_private.is_coach() or exists(
  select 1 from public.comets_game_videos v where v.object_path=name and v.published
  and exists(select 1 from public.user_roles where user_id=auth.uid() and role in ('coach','player'))
 )));
drop policy if exists game_video_files_upload on storage.objects;
create policy game_video_files_upload on storage.objects for insert to authenticated
 with check (bucket_id='comets-game-video' and comets_private.is_coach() and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists game_video_files_delete on storage.objects;
create policy game_video_files_delete on storage.objects for delete to authenticated
 using (bucket_id='comets-game-video' and comets_private.is_coach());
notify pgrst, 'reload schema';
commit;
