/* Execute real PostgreSQL/PLpgSQL in an isolated PGlite database, never production.
   npm install --prefix /tmp/comets-pg-tests @electric-sql/pglite@0.3.14
   PGLITE_PATH=/tmp/comets-pg-tests/node_modules/@electric-sql/pglite node tests/club-database.cjs */
const {PGlite}=require(process.env.PGLITE_PATH||'@electric-sql/pglite');
const fs=require('node:fs'),assert=require('node:assert/strict');
const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
(async()=>{const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema comets_private;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.user_roles(user_id uuid primary key references auth.users,role text);
 create table public.profiles(id uuid primary key references auth.users,display_name text not null);
 create table public.squad_players(id uuid primary key,full_name text,active boolean default true);
 create table public.player_links(user_id uuid primary key references auth.users,player_id uuid references public.squad_players);
 create table public.fixtures(id uuid primary key,opponent text,match_date date);
 create table public.match_stats(id uuid primary key default gen_random_uuid(),player_id uuid references public.squad_players,fixture_id uuid references public.fixtures,tries int default 0,tackles int default 0,metres int default 0,errors int default 0,unique(player_id,fixture_id));
 create function comets_private.is_coach() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.user_roles where user_id=auth.uid() and role='coach')$$;
 grant usage on schema public,auth,comets_private to authenticated,anon;
 grant select on public.user_roles,public.squad_players,public.player_links to authenticated;
 `);
 for(const [n,email,role] of [[1,'coach@example.test','coach'],[2,'tommy@example.test','coach'],[3,'player@example.test','player'],[4,'other@example.test','player']]){await db.query('insert into auth.users values($1,$2)',[id(n),email]);await db.query('insert into public.user_roles values($1,$2)',[id(n),role])}
 for(const n of [101,102,103])await db.query('insert into public.squad_players(id,full_name) values($1,$2)',[id(n),'Player '+n]);
 await db.query('insert into public.player_links values($1,$2),($3,$4)',[id(3),id(101),id(4),id(103)]);
 for(const [n,date] of [[201,'2027-03-01'],[202,'2027-03-10'],[203,'2027-03-20'],[204,'2028-03-01']])await db.query('insert into public.fixtures values($1,$2,$3)',[id(n),'  Eels  ',date]);
 await db.exec(fs.readFileSync('supabase/migrations/20261109_club_briefings_and_highs.sql','utf8'));
 const as=async n=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?id(n):'']);await db.exec('set role authenticated')};
 const one=async(sql,args=[])=> (await db.query(sql,args)).rows[0];
 await db.exec(fs.readFileSync('supabase/migrations/20261106_player_benchmarks.sql','utf8'));
 const progressMigration=fs.readdirSync('supabase/migrations').find(name=>name.endsWith('_own_fitness_progress.sql'));
 await db.exec(fs.readFileSync('supabase/migrations/'+progressMigration,'utf8'));
 await db.query(`insert into public.comets_player_benchmarks(player_id,benchmark,result,tested_on,notes,recorded_by)
 values ($1,'bronco',330,'2027-03-01','Private coaching note',$3),
        ($2,'bronco',390,'2027-03-01','Other player note',$3)`,[id(101),id(103),id(1)]);
 await as(3);
 const {rows:ownProgress}=await db.query('select * from public.comets_my_benchmarks()');
 assert.deepEqual(ownProgress.map(row=>Number(row.result)),[330]);
 assert.deepEqual(Object.keys(ownProgress[0]),['benchmark','result','tested_on','created_at']);
 assert.equal((await db.query('select * from public.comets_player_benchmarks')).rows.length,0);
 assert.equal((await db.query('update public.comets_player_benchmarks set result=1 returning id')).rows.length,0);
 await as(4);
 assert.equal(Number((await one('select result from public.comets_my_benchmarks()')).result),390);
 await as(2);
 assert.equal((await db.query('select * from public.comets_my_benchmarks()')).rows.length,0);
 assert.equal((await db.query('select * from public.comets_player_benchmarks')).rows.length,2);
 await db.exec('reset role; set role anon');
 await assert.rejects(()=>db.query('select * from public.comets_my_benchmarks()'),/permission denied/);
 const briefing=(action,revision,strength='Strong forwards',priorities='Close the middle')=>db.query('select public.comets_save_briefing($1,$2,$3,$4,$5,$6,$7) result',[id(202),strength,'Slow lateral cover',priorities,'',revision,action]);
 await as(3);await assert.rejects(()=>briefing('publish',0));await assert.rejects(()=>db.query('select public.comets_link_member($1,$2)',['coach@example.test',id(102)]));
 await as(1);await briefing('save',0,'Private initial notes');
 await as(3);assert.equal((await db.query('select * from comets_briefing_drafts')).rows.length,0);assert.equal((await db.query('select * from comets_opponent_notes')).rows.length,0);assert.equal((await db.query('select * from comets_published_briefings')).rows.length,0);
 await as(1);await briefing('publish',1,'Published strengths');
 await as(3);assert.equal((await one('select strengths from comets_published_briefings')).strengths,'Published strengths');assert.equal(Number((await one('select comets_unread_count() count')).count),1);await db.exec('update comets_notifications set read_at=now()');
 await assert.rejects(()=>db.exec("update comets_notifications set body='forged'"));await assert.rejects(()=>db.exec("insert into comets_notifications(user_id,source_key,kind,title,body) values(auth.uid(),'fake','personal_best','fake','fake')"));
 await as(1);await briefing('save',2,'New private revision');
 await as(3);assert.equal((await one('select strengths from comets_published_briefings')).strengths,'Published strengths');assert.equal(Number((await one('select comets_unread_count() count')).count),0);
 await as(1);await briefing('publish',3,'New private revision');
 await as(3);assert.equal(Number((await one('select count(*) count from comets_notifications')).count),1);assert.equal(Number((await one('select comets_unread_count() count')).count),1);await db.exec('update comets_notifications set read_at=now()');
 await as(1);await briefing('publish',4,'New private revision');await assert.rejects(()=>briefing('save',0));
 await as(3);assert.equal(Number((await one('select comets_unread_count() count')).count),0);
 await as(1);await briefing('unpublish',5,'New private revision');
 await as(3);assert.equal((await db.query('select * from comets_published_briefings')).rows.length,0);assert.equal(Number((await one('select count(*) count from comets_notifications')).count),0);
 // Linking cannot elevate roles, assign someone else's player, or unlink a player account.
 await as(1);await db.query('select comets_link_member($1,$2)',['coach@example.test',id(102)]);assert.equal((await one('select role from user_roles where user_id=auth.uid()')).role,'coach');await assert.rejects(()=>db.query('select comets_link_member($1,$2)',['tommy@example.test',id(102)]));await assert.rejects(()=>db.query('select comets_link_member($1,null)',['player@example.test']));await db.query('select comets_link_member($1,null)',['tommy@example.test']);
 // Seed/save stats as owner, while the session's auth identity remains the coach.
 await db.exec('reset role');
 const stat=async(player,fixture,tackles)=>db.query('insert into match_stats(player_id,fixture_id,tackles) values($1,$2,$3) on conflict(player_id,fixture_id) do update set tackles=excluded.tackles',[id(player),id(fixture),tackles]);
 await stat(101,201,10);assert.equal(Number((await one('select count(*) count from comets_notifications')).count),0);
 await stat(101,202,22);await as(3);assert.equal(Number((await one('select comets_unread_count() count')).count),1);assert.match((await one('select title from comets_notifications')).title,/22 tackles/);await db.exec('update comets_notifications set read_at=now()');
 await db.exec('reset role');await stat(101,203,22);assert.equal(Number((await one('select count(*) count from comets_notifications')).count),1);
 await stat(101,202,23);await as(3);assert.match((await one('select title from comets_notifications')).title,/23 tackles/);assert.equal(Number((await one('select comets_unread_count() count')).count),0);
 await db.exec('reset role');await stat(101,202,9);assert.equal(Number((await one('select count(*) count from comets_notifications')).count),0);await stat(101,203,22);assert.equal(Number((await one('select count(*) count from comets_notifications')).count),1);await stat(101,203,8);assert.equal(Number((await one('select count(*) count from comets_notifications')).count),0);await stat(101,204,40);assert.equal(Number((await one('select count(*) count from comets_notifications')).count),0);
 await stat(102,201,5);await stat(102,202,9);await as(1);assert.equal(Number((await one('select comets_unread_count() count')).count),1);assert.match((await one('select title from comets_notifications')).title,/9 tackles/);
 await as(4);assert.equal((await db.query('select * from comets_notifications')).rows.length,0);
 await as(1);await db.query('select comets_link_member($1,null)',['coach@example.test']);assert.equal((await db.query('select * from comets_notifications')).rows.length,0);
 await db.exec('reset role');await db.query('insert into match_stats(player_id,fixture_id) values($1,$2)',[id(103),id(201)]);await db.query('insert into match_stats(player_id,fixture_id,hitups) values($1,$2,8)',[id(103),id(202)]);await as(4);assert.equal(Number((await one('select comets_unread_count() count')).count),0);await db.exec('reset role');await db.query('insert into match_stats(player_id,fixture_id,hitups) values($1,$2,9)',[id(103),id(203)]);await as(4);assert.match((await one('select title from comets_notifications')).title,/9 hit-ups/);
 await db.exec('reset role');await db.exec(fs.readFileSync('supabase/migrations/20261109_club_briefings_and_highs.sql','utf8'));
 console.log('PASS: actual PostgreSQL migration, coach/player permissions, private/public snapshots, publishing deduplication, stale-save rejection, coach-player linking, PB baselines/ties/corrections, seasons and private notification access.');
 }finally{await db.close()}})().catch(e=>{console.error(e.message);if(e.position)console.error('SQL position:',e.position);process.exitCode=1});
