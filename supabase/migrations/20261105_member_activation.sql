-- Additive activation setup. Run once in Supabase SQL Editor as project owner.
-- Existing accounts, tables and policies are not replaced.
begin;
create table if not exists public.comets_activation_codes (
 id uuid primary key default gen_random_uuid(),
 code_hash text not null unique,
 email text not null,
 display_name text not null,
 role text not null check (role in ('coach','player')),
 player_id uuid references public.squad_players(id),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now() + interval '24 hours',
 status text not null default 'pending' check (status in ('pending','claimed','used','revoked')),
 claim_id uuid,
 redeemed_by uuid references auth.users(id),
 check (role <> 'player' or player_id is not null)
);
alter table public.comets_activation_codes enable row level security;
revoke all on public.comets_activation_codes from public, anon, authenticated;
grant all on public.comets_activation_codes to service_role;

-- Only the server-side Edge Function may claim or complete an activation.
create or replace function public.comets_claim_activation(p_hash text, p_email text, p_claim uuid)
returns setof public.comets_activation_codes language sql security definer set search_path = '' as $$
 update public.comets_activation_codes c set status='claimed', claim_id=p_claim
 where c.code_hash=p_hash and c.email=lower(trim(p_email))
 and c.status='pending' and c.expires_at>now()
 and exists(select 1 from public.user_roles r where r.user_id=c.created_by and r.role='coach')
 returning c.*;
$$;

create or replace function public.comets_complete_activation(p_id uuid, p_claim uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.comets_activation_codes;
begin
 select * into c from public.comets_activation_codes where id=p_id for update;
 if not found or c.status<>'claimed' or c.claim_id is distinct from p_claim then
  raise exception 'Activation is no longer available';
 end if;
 if not exists(select 1 from public.user_roles where user_id=c.created_by and role='coach') then
  raise exception 'The issuing coach no longer has access';
 end if;
 if not exists(select 1 from auth.users where id=p_user and lower(email)=c.email) then
  raise exception 'Account does not match invitation';
 end if;
 if c.player_id is not null then
  perform 1 from public.squad_players where id=c.player_id and active for update;
  if not found then raise exception 'Player is no longer active'; end if;
  if exists(select 1 from public.player_links where player_id=c.player_id and user_id<>p_user) then
   raise exception 'Player already has an account';
  end if;
 end if;
 update public.profiles set display_name=c.display_name where id=p_user;
 if not found then insert into public.profiles(id,display_name) values(p_user,c.display_name); end if;
 delete from public.user_roles where user_id=p_user;
 insert into public.user_roles(user_id,role) values(p_user,c.role);
 delete from public.player_links where user_id=p_user;
 if c.player_id is not null then insert into public.player_links(user_id,player_id) values(p_user,c.player_id); end if;
 update public.comets_activation_codes set status='used',redeemed_by=p_user where id=c.id;
end;
$$;
revoke all on function public.comets_claim_activation(text,text,uuid) from public,anon,authenticated;
revoke all on function public.comets_complete_activation(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.comets_claim_activation(text,text,uuid) to service_role;
grant execute on function public.comets_complete_activation(uuid,uuid,uuid) to service_role;
commit;
