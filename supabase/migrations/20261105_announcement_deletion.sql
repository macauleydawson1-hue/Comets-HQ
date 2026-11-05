-- Delete one announcement and its reactions/replies atomically.
-- Existing policies and other records are preserved.
begin;
create or replace function public.comets_delete_announcement(p_post_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare post public.announcements;
begin
 if auth.uid() is null then raise exception 'Sign in before deleting an announcement'; end if;
 select * into post from public.announcements where id::text=p_post_id for update;
 if not found then return false; end if;
 if post.author_id is distinct from auth.uid() and not comets_private.is_coach() then
  raise exception 'Only the author or a coach can delete this announcement';
 end if;
 delete from public.announcement_likes where announcement_id=post.id;
 delete from public.announcement_comments where announcement_id=post.id;
 delete from public.announcements where id=post.id;
 return true;
end;
$$;
revoke all on function public.comets_delete_announcement(text) from public,anon;
grant execute on function public.comets_delete_announcement(text) to authenticated;
commit;
