/* COMETS HQ live bridge. Original V6.2 HTML/CSS and five-tab render retained. */
(()=>{'use strict';
const URL='https://bdydfdxxjpdkfqhsjbbf.supabase.co', KEY='sb_publishable_MS2Ukw3FYfmmJpnYEdB-UQ_0KUfheP0';
let entering=null, db,user,role='player',displayName='',myId=null,ready=false,busy=false,dbPlayers=[],dbFixtures=[],dbSessions=[],dbSelections=[],dbStats=[],dbPrograms=[],dbLogs=[],dbAvailability=[];
const wall=document.getElementById('auth-wall'),notice=document.getElementById('comets-auth-message');
const esc2=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const coach=()=>role==='coach', firstName=()=>displayName.split(/\s+/)[0]|| (coach()?'Coach':'Player'), val=id=>document.getElementById(id)?.value?.trim()||'', err=e=>e?.message||String(e);
const api=async(t)=>{const {data,error}=await db.from(t).select('*');if(error)throw error;return data||[]};
const write=async(t,method,obj,id)=>{let q=db.from(t);q=method==='insert'?q.insert(obj):method==='upsert'?q.upsert(obj):method==='delete'?q.delete().eq('id',id):q.update(obj).eq('id',id);const {error}=await q;if(error)throw error};
const safe=async(fn)=>{try{await fn()}catch(e){alert('COMETS HQ: '+err(e))}};
const renderBase=window.render;
function refresh(){if(!ready)return;previewMode=coach()?'coach':'player';if(!coach()){previewPlayerId=myId||'';}window.render();enhance();}
function enhance(){
 document.querySelector('.mode-switch-wrap')?.setAttribute('hidden','');
 const a=document.querySelector('.athlete');if(a)a.textContent=(displayName || (coach()?'COACH DASHBOARD':'PLAYER DASHBOARD')).toUpperCase();
 if(state.tab==='home'){const intro=document.querySelector('#app .dashboard-intro h2');if(intro)intro.textContent='Welcome back, '+firstName();}
 document.getElementById('preview-warning')?.setAttribute('hidden','');
 const app=document.getElementById('app');if(!app)return;
 if(state.tab==='home')showSidelinePreview(app);
 if(state.tab==='stats')renderLiveStats(app);

 if(state.tab==='team'&&coach()){
   if(teamSubtab==='selection'){
     // Retain the original Team inner tabs; replace only the selection content.
     const tabs=app.querySelector('.inner-tabs');
     if(tabs){let next=tabs.nextElementSibling;while(next){const remove=next;next=next.nextElementSibling;remove.remove();}}
     const heading=document.createElement('div');heading.className='section-head';heading.innerHTML='<div class="club-kicker">FIRST GRADE · LIVE</div><h2>TEAM SELECTION</h2>';
     app.appendChild(heading);appendSelections(app);
   }
   if(teamSubtab==='availability')appendAvailability(app);
 }
 if(state.tab==='team'&&!coach())appendAvailability(app);
 if(state.tab==='matches'&&coach())appendMatchStats(app);

 if(!coach()&&state.tab==='training')app.innerHTML='<div class="section-head"><div class="club-kicker">FIRST GRADE · PRIVATE</div><h2>MY TRAINING</h2></div>';
 if(coach()&&state.tab==='playerprograms')app.innerHTML='<div class="section-head"><h2>PLAYER PROGRAMS</h2></div>'; 
 if(state.tab==='training'||(coach()&&state.tab==='playerprograms'))appendTraining(app);

}

function statTotal(p,k){return dbStats.filter(x=>x.player_id===p.id).reduce((n,x)=>n+(Number(x[k])||0),0)}
function renderLiveStats(app){
 const players=dbPlayers.slice().sort((a,b)=>a.full_name.localeCompare(b.full_name));
 const games=p=>dbStats.filter(x=>x.player_id===p.id).length;
 const fmt=n=>Number(n).toLocaleString('en-AU');
 const sections=[['tries','TRIES'],['metres','RUNNING METRES'],['tackles','TACKLES'],['errors','ERRORS']];
 const nav='<div class="stats-view-switch"><button class="active" data-stats-view="cards">PLAYER STATS</button><button data-stats-view="leaders">LEADERBOARDS</button></div>';
 app.innerHTML='<div class="section-head"><div class="club-kicker">FIRST GRADE · PERFORMANCE</div><h2>PLAYER STATISTICS</h2><p>Official match statistics, shared with the squad.</p></div>'+nav+'<div id="stats-content"></div>';
 const root=app.querySelector('#stats-content');
 const show=view=>{
  app.querySelectorAll('[data-stats-view]').forEach(b=>b.classList.toggle('active',b.dataset.statsView===view));
  if(view==='cards'){
   root.innerHTML='<div class="stats-summary-row"><div class="stat"><strong>'+players.length+'</strong><small>PLAYERS</small></div><div class="stat"><strong>'+dbFixtures.length+'</strong><small>FIXTURES</small></div><div class="stat"><strong>'+dbStats.length+'</strong><small>PLAYER GAMES</small></div></div>'+
   (players.length?players.map(p=>{const g=games(p),t=statTotal(p,'tries'),m=statTotal(p,'metres'),tk=statTotal(p,'tackles');return '<section class="card player-stats-card"><div class="club-kicker">COMETS · '+esc2(p.position||'FIRST GRADE')+'</div><h3>'+esc2(p.full_name)+'</h3><div class="stats-player-grid"><div><b>'+g+'</b><small>GAMES</small></div><div><b>'+t+'</b><small>TRIES</small></div><div><b>'+fmt(m)+'</b><small>METRES</small></div><div><b>'+tk+'</b><small>TACKLES</small></div></div><div class="stats-averages"><span>'+Math.round(m/(g||1))+' metres/game</span><span>'+Math.round(tk/(g||1))+' tackles/game</span></div><details><summary>VIEW MATCH BREAKDOWN</summary>'+(dbStats.filter(x=>x.player_id===p.id).map(x=>{const f=dbFixtures.find(f=>f.id===x.fixture_id);return '<div class="club-row"><b>'+esc2(f?.opponent||'Match')+'</b><small>'+esc2(f?.match_date||'')+' · '+x.tries+' tries · '+x.metres+' m · '+x.tackles+' tackles</small></div>'}).join('')||'<p class="muted">No match stats recorded yet.</p>')+'</details></section>'}).join(''):'<section class="card"><p class="muted">Add players in Team to begin tracking statistics.</p></section>');
  }else{
   root.innerHTML=sections.map(([k,label])=>'<section class="card"><div class="club-kicker">TEAM LEADERBOARD</div><h3>'+label+'</h3><div class="leaderboard-scroll"><table class="leaderboard"><thead><tr><th>RANK</th><th>PLAYER</th><th>'+label+'</th></tr></thead><tbody>'+players.slice().sort((a,b)=>statTotal(b,k)-statTotal(a,k)||a.full_name.localeCompare(b.full_name)).map((p,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc2(p.full_name)+'</td><td>'+fmt(statTotal(p,k))+'</td></tr>').join('')+'</tbody></table></div></section>').join('');
  }
 };
 app.querySelectorAll('[data-stats-view]').forEach(b=>b.onclick=()=>show(b.dataset.statsView));
 show('cards');
}
async function showSidelinePreview(app){
 const slot=app.querySelector('.sideline-feature');
 if(!slot)return;
 // Keep the original gold Sideline card in its original homepage position.
 slot.innerHTML='<div class="notice-title"><div><div class="club-kicker">TEAM COMMUNICATION</div><h3>THE SIDELINE</h3></div><button class="secondary tinybtn" id="sideline-all">VIEW ALL</button></div><p class="muted">Loading latest announcement…</p>';
 slot.querySelector('#sideline-all').onclick=showFeed;
 try{
  const {data,error}=await db.from('announcements').select('id,body,author_id,created_at,pinned').order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  if(!slot.isConnected||state.tab!=='home')return;
  const posts=data||[],latest=posts[0],key='comets-sideline-seen-'+user.id;
  const seen=localStorage.getItem(key)||'';
  const unread=posts.filter(p=>p.created_at>seen).length;
  const summary=latest?esc2(latest.body.length>150?latest.body.slice(0,150)+'…':latest.body):'No announcements yet.';
  slot.innerHTML='<div class="notice-title"><div><div class="club-kicker">TEAM COMMUNICATION</div><h3>THE SIDELINE '+(unread?'<span class="sideline-unread">'+unread+' NEW</span>':'')+'</h3></div><button class="secondary tinybtn" id="sideline-all">VIEW ALL</button></div><div class="sideline-latest"><div class="club-kicker">LATEST ANNOUNCEMENT</div><p>'+summary+'</p></div>';
  slot.querySelector('#sideline-all').onclick=showFeed;
 }catch(e){if(slot.isConnected)slot.innerHTML='<h3>THE SIDELINE</h3><p class="muted">Announcements unavailable right now.</p><button class="secondary tinybtn" id="sideline-all">VIEW ALL</button>';slot.querySelector('#sideline-all').onclick=showFeed}
}
function account(){let el=document.getElementById('comets-account');if(!el){el=document.createElement('div');el.id='comets-account';el.className='account-mini';document.querySelector('header').before(el)}el.innerHTML='<button class="account-mini-btn" id="acc-btn">ACCOUNT ⚙</button><div id="acc-panel" class="account-mini-menu" hidden></div>';document.getElementById('acc-btn').onclick=()=>{const p=document.getElementById('acc-panel');p.hidden=!p.hidden};const p=document.getElementById('acc-panel');p.innerHTML='<p class="mini">'+esc2(displayName||'Comets member')+'</p><p class="mini">'+esc2(user.email)+'</p><button class="secondary tinybtn" id="acc-name">EDIT MY NAME</button><button class="secondary tinybtn" id="acc-out">SIGN OUT</button>'+(coach()?'<button class="secondary tinybtn" id="acc-invite">INVITE MEMBER</button><button class="secondary tinybtn" id="acc-import">IMPORT LOCAL BACKUP</button>':'');if(p.querySelector('#acc-install'))p.querySelector('#acc-install').onclick=()=>{alert(/iPad|iPhone|iPod/.test(navigator.userAgent)?'On iPhone: open COMETS HQ in Safari, tap Share (square with arrow), then Add to Home Screen, then Add. Open the new Comets HQ icon.':'In your browser, open the menu and choose Install app or Add to Home Screen.');};p.querySelector('#acc-out').onclick=()=>db.auth.signOut();p.querySelector('#acc-name').onclick=()=>safe(async()=>{const name=prompt('Name shown on your COMETS HQ dashboard',displayName);if(name===null)return;const clean=name.trim().replace(/\s+/g,' ');if(!clean||clean.length>100)return alert('Please enter a name (up to 100 characters).');const {error}=await db.from('profiles').update({display_name:clean}).eq('id',user.id);if(error)throw error;displayName=clean;account();refresh()});if(coach()){p.querySelector('#acc-invite').onclick=invite;p.querySelector('#acc-import').onclick=importLocal}}
function login(){ready=false;document.querySelector('header').style.display='none';document.querySelector('.mode-switch-wrap')?.setAttribute('hidden','');document.getElementById('app').style.display='none';document.getElementById('tabs').style.display='none';document.getElementById('comets-account')?.remove();wall.hidden=false;document.querySelector('.auth-box .athlete')?.remove();notice.textContent='Invitation-only access for Comets players and coaches.'}
async function enter(){if(entering)return entering;entering=enterOnce();try{return await entering}finally{entering=null}}
async function enterOnce(){const {data:{session},error:sessionError}=await db.auth.getSession();if(sessionError)throw sessionError;if(!session?.user)return login();const {data:{user:u},error}=await db.auth.getUser();if(error)throw error;if(!u)return login();user=u;const {data:r,error:re}=await db.from('user_roles').select('role').eq('user_id',u.id).single();if(re)throw re;role=r.role;const {data:profile,error:profileError}=await db.from('profiles').select('display_name').eq('id',u.id).maybeSingle();if(profileError)throw profileError;displayName=(profile?.display_name||u.user_metadata?.display_name||'').trim();const {data:link}=await db.from('player_links').select('player_id').eq('user_id',u.id).maybeSingle();myId=link?.player_id||null;await load();wall.hidden=true;document.querySelector('header').style.display='';document.getElementById('app').style.display='';document.getElementById('tabs').style.display='';ready=true;account();state.tab='home';refresh()}
async function load(){[dbPlayers,dbFixtures,dbSessions,dbSelections,dbStats,dbPrograms,dbLogs,dbAvailability]=await Promise.all(['squad_players','fixtures','training_sessions','team_selections','match_stats','player_programs','player_training','player_availability'].map(api));
 // Map the shared data into the original V6.2 view models. Do not erase unrelated local gym logs.
 club.players=dbPlayers.map(p=>({id:p.id,name:p.full_name,position:p.position,jersey:p.jersey_number||'',notes:''}));
 club.matches=dbFixtures.map(f=>({id:f.id,opponent:f.opponent,date:f.match_date,venue:f.venue,us:f.points_for,them:f.points_against}));
 club.sessions=dbSessions.map(s=>({id:s.id,title:'Team training',date:s.starts_at.slice(0,10),time:new Date(s.starts_at).toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}),venue:s.location,focus:s.notes}));
 club.selections={};club.publishedSelections={};for(const f of dbFixtures){const picks=dbSelections.filter(s=>s.fixture_id===f.id);const key=f.round_label||f.opponent+' '+f.match_date;club.selections[key]=Array(17).fill('');for(const s of picks){const idx=Number(s.position);if(Number.isInteger(idx)&&idx>=0&&idx<17)club.selections[key][idx]=s.player_id}club.publishedSelections[key]=picks.some(s=>s.published)}
 club.playerStats={};club.matchPlayerStats={};for(const s of dbStats){const p=club.playerStats[s.player_id]||={games:0,tries:0,tackles:0,metres:0,errors:0};p.games++;for(const k of ['tries','tackles','metres','errors'])p[k]+=s[k]||0;club.matchPlayerStats[s.fixture_id]||={};club.matchPlayerStats[s.fixture_id][s.player_id]={played:true,...s}}
 if(!coach()&&myId){club.playerTraining={};club.playerTraining[myId]={sessions:dbLogs.filter(x=>x.player_id===myId&&x.kind==='workout').map(x=>({id:x.id,date:x.logged_at.slice(0,10),name:x.details,notes:''})),nutrition:dbLogs.filter(x=>x.player_id===myId&&x.kind==='nutrition').map(x=>({id:x.id,date:x.logged_at.slice(0,10),notes:x.details})),program:dbPrograms.find(x=>x.player_id===myId)?.details||''};}
 save();}
// Override original mutators so coach writes go to the shared backend; the original cards stay in place.
window.playerAdd=()=>safe(async()=>{if(!coach())return;const name=val('player-name'),position=val('player-pos');if(!name)return alert('Enter a player name');await write('squad_players','insert',{full_name:name,position});await load();refresh()});
window.playerRemove=id=>safe(async()=>{if(!coach()||!confirm('Remove this player?'))return;await write('squad_players','delete',null,id);await load();refresh()});
window.profileSave=id=>safe(async()=>{if(!coach())return;await write('squad_players','update',{full_name:val('profile-name'),position:val('profile-position'),jersey_number:val('profile-jersey')?Number(val('profile-jersey')):null},id);await load();refresh()});
window.matchAdd=()=>safe(async()=>{if(!coach())return;const opponent=val('match-opponent'),match_date=val('match-date');if(!opponent||!match_date)return alert('Enter opponent and date');const x=val('match-us'),y=val('match-them');if(Boolean(x)!==Boolean(y))return alert('Enter both scores or neither');await write('fixtures','insert',{opponent,match_date,venue:val('match-venue'),points_for:x===''?null:Number(x),points_against:y===''?null:Number(y)});await load();refresh()});
window.matchDelete=id=>safe(async()=>{if(!coach()||!confirm('Delete fixture?'))return;await write('fixtures','delete',null,id);await load();refresh()});
window.trainingAdd=()=>safe(async()=>{if(!coach())return;const date=val('session-date');if(!date)return alert('Enter date');const time=val('session-time')||'18:00';await write('training_sessions','insert',{starts_at:new Date(date+'T'+time+':00').toISOString(),location:val('session-venue'),notes:[val('session-title'),val('session-focus')].filter(Boolean).join(' — ')});await load();refresh()});
window.trainingDelete=id=>safe(async()=>{if(!coach()||!confirm('Delete training session?'))return;await write('training_sessions','delete',null,id);await load();refresh()});
function appendSelections(app){
 const c=document.createElement('section');c.className='card';
 const positions=['Fullback','Wing','Centre','Centre','Wing','Five-eighth','Halfback','Prop','Hooker','Prop','Second row','Second row','Lock','Interchange','Interchange','Interchange','Interchange'];
 c.innerHTML='<div class="club-kicker">MATCH DAY · 17 PLAYERS</div><h2>Team selection</h2><p class="muted">Pick the starting 13 and four interchange. Drafts stay private until published.</p><label>Round / fixture</label><select id="sel-fixture">'+dbFixtures.map(x=>'<option value="'+x.id+'">'+esc2((x.round_label?x.round_label+' · ':'')+x.opponent+' · '+x.match_date)+'</option>').join('')+'</select><div class="selection-count" id="sel-count">0<span> / 17 SELECTED</span></div><div class="selection-heading">STARTING XIII</div><div id="sel-slots"></div><div class="tools"><button class="primary" id="sel-save">SAVE DRAFT</button><button class="secondary" id="sel-publish">PUBLISH TEAM</button></div>';
 app.appendChild(c);
 const draw=()=>{
  const fid=val('sel-fixture');
  const slots=c.querySelector('#sel-slots');
  slots.innerHTML=positions.map((position,i)=>(i===13?'<div class="selection-heading">INTERCHANGE</div>':'')+'<div class="team-slot"><span class="jersey-number">'+(i+1)+'</span><div class="slot-details"><b>'+esc2(position)+'</b><select class="sel-player" data-slot="'+i+'" aria-label="Select '+esc2(position)+'"><option value="">Choose player</option>'+dbPlayers.slice().sort((a,b)=>a.full_name.localeCompare(b.full_name)).map(p=>'<option value="'+p.id+'" '+(dbSelections.some(s=>s.fixture_id===fid&&s.player_id===p.id&&s.position===String(i))?'selected':'')+'>'+esc2(p.full_name)+'</option>').join('')+'</select></div></div>').join('');
  const updateCount=()=>{c.querySelector('#sel-count').innerHTML=slots.querySelectorAll('.sel-player').length?Array.from(slots.querySelectorAll('.sel-player')).filter(x=>x.value).length+'<span> / 17 SELECTED</span>':'0<span> / 17 SELECTED</span>'};
  slots.querySelectorAll('.sel-player').forEach(el=>el.onchange=()=>{const chosen=Array.from(slots.querySelectorAll('.sel-player')).filter(x=>x.value===el.value&&x!==el);if(el.value&&chosen.length){alert('That player is already selected.');el.value=''}updateCount()});
  updateCount();
 };
 c.querySelector('#sel-fixture').onchange=draw;draw();
 const saveSel=async(pub)=>safe(async()=>{
  const fid=val('sel-fixture');if(!fid)return alert('Add a fixture in Matches first.');
  const chosen=[...c.querySelectorAll('.sel-player')].map(x=>({player_id:x.value,position:x.dataset.slot})).filter(x=>x.player_id);
  if(new Set(chosen.map(x=>x.player_id)).size!==chosen.length)return alert('A player cannot appear twice.');
  if(pub&&chosen.length!==17)return alert('Select all 17 players before publishing.');
  const {error:d}=await db.from('team_selections').delete().eq('fixture_id',fid);if(d)throw d;
  if(chosen.length){const {error:i}=await db.from('team_selections').insert(chosen.map(x=>({...x,fixture_id:fid,published:pub})));if(i)throw i}
  let noticeWarning='';
  if(pub){
   const fixture=dbFixtures.find(f=>f.id===fid);
   const label=fixture?((fixture.round_label?fixture.round_label+' · ':'')+fixture.opponent+' · '+fixture.match_date):'upcoming match';
   const {error:announcementError}=await db.from('announcements').insert({author_id:user.id,body:'TEAM NAMED: The First Grade 1–17 has been published for '+label+'. Check Team → Team Selection for the lineup.'});
   if(announcementError)noticeWarning=' Team saved, but the Sideline announcement could not be posted: '+err(announcementError);
  }
  await load();refresh();alert((pub?'Team published':'Draft saved')+noticeWarning);
 });
 c.querySelector('#sel-save').onclick=()=>saveSel(false);
 c.querySelector('#sel-publish').onclick=()=>saveSel(true);
}

function appendAvailability(app){const c=document.createElement('section');c.className='card';c.innerHTML='<h3>LIVE AVAILABILITY</h3>'+(coach()?'<p class="muted">Players are assumed available unless they report otherwise.</p>':'<p class="muted">You are assumed available. Only report a change if you cannot play.</p>')+(!coach()&&!myId?'<p>Your account has not been linked to a squad player yet. Ask a coach.</p>':'')+dbFixtures.map(f=>'<div class="club-row"><b>'+esc2(f.opponent+' · '+f.match_date)+'</b>'+(coach()?'<small>'+esc2(dbAvailability.filter(a=>a.fixture_id===f.id).map(a=>(dbPlayers.find(p=>p.id===a.player_id)?.full_name||'Player')+': '+a.status).join(' · ')||'No responses')+'</small>':'<select data-av="'+f.id+'"><option value="">Choose</option>'+['available','unavailable','unsure'].map(v=>'<option value="'+v+'" '+(dbAvailability.some(a=>a.fixture_id===f.id&&a.player_id===myId&&a.status===v)?'selected':'')+'>'+v+'</option>').join('')+'</select>')+'</div>').join('');app.appendChild(c);if(!coach()&&myId)c.querySelectorAll('[data-av]').forEach(x=>x.onchange=()=>safe(async()=>{const {error}=await db.from('player_availability').upsert({player_id:myId,fixture_id:x.dataset.av,status:x.value});if(error)throw error;await load();refresh()}))}
function appendMatchStats(app){const c=document.createElement('section');c.className='card';c.innerHTML='<h3>OFFICIAL MATCH STATS</h3><p class="muted">Enter match-by-match figures. Player totals update for everyone.</p><select id="stat-fixture">'+dbFixtures.map(f=>'<option value="'+f.id+'">'+esc2(f.opponent+' · '+f.match_date)+'</option>').join('')+'</select><select id="stat-player">'+dbPlayers.map(p=>'<option value="'+p.id+'">'+esc2(p.full_name)+'</option>').join('')+'</select>'+['tries','tackles','metres','errors'].map(k=>'<label>'+k+'</label><input type="number" min="0" id="stat-'+k+'" value="0">').join('')+'<button class="primary" id="stat-save">SAVE MATCH STATS</button>';app.appendChild(c);c.querySelector('#stat-save').onclick=()=>safe(async()=>{const obj={fixture_id:val('stat-fixture'),player_id:val('stat-player')};if(!obj.fixture_id||!obj.player_id)return alert('Choose a fixture and player');for(const k of ['tries','tackles','metres','errors'])obj[k]=Number(val('stat-'+k))||0;const {error}=await db.from('match_stats').upsert(obj,{onConflict:'fixture_id,player_id'});if(error)throw error;await load();refresh()})}
function appendTraining(app){const c=document.createElement('section');c.className='card';if(coach()){c.innerHTML='<h3>LIVE PLAYER PROGRAMS</h3><p class="muted">Only the assigned player and coaches can view each program.</p><select id="prog-player">'+dbPlayers.map(p=>'<option value="'+p.id+'">'+esc2(p.full_name)+'</option>').join('')+'</select><input id="prog-title" placeholder="Program title"><textarea id="prog-details" placeholder="Exercises, sets and instructions"></textarea><button class="primary" id="prog-save">ASSIGN PROGRAM</button>';app.appendChild(c);c.querySelector('#prog-save').onclick=()=>safe(async()=>{if(!val('prog-player')||!val('prog-title'))return alert('Choose player and title');await write('player_programs','insert',{player_id:val('prog-player'),title:val('prog-title'),details:val('prog-details')});await load();refresh()})}else{c.innerHTML='<h3>MY PRIVATE TRAINING LOG</h3>'+(myId?'<input id="log-kind" type="hidden" value="workout"><select id="log-type"><option value="workout">Workout</option><option value="nutrition">Nutrition</option><option value="progress">Progress</option></select><textarea id="log-details" placeholder="What did you complete?"></textarea><label>Current weight (kg, optional)</label><input id="log-weight" type="number" step="0.1"><button class="primary" id="log-save">SAVE PRIVATE LOG</button>':'<p>Ask a coach to link your account to your squad profile.</p>')+dbPrograms.filter(x=>x.player_id===myId).map(x=>'<div class="club-row"><b>'+esc2(x.title)+'</b><p>'+esc2(x.details)+'</p></div>').join('');app.appendChild(c);if(myId)c.querySelector('#log-save').onclick=()=>safe(async()=>{const {error}=await db.from('player_training').insert({player_id:myId,kind:val('log-type'),details:val('log-details'),weight_kg:val('log-weight')?Number(val('log-weight')):null});if(error)throw error;await load();refresh()})}}
async function invite(){if(!coach())return;const email=prompt('Email address to invite');if(!email)return;const role=confirm('Invite as a COACH? OK = Coach, Cancel = Player')?'coach':'player';let player_id=null;if(role==='player'){const name=prompt('Exact squad player name to link');const p=dbPlayers.find(x=>x.full_name.toLowerCase()===(name||'').trim().toLowerCase());if(!p)return alert('Player not found. Add them to Team → Squad first.');player_id=p.id}await safe(async()=>{const {data,error}=await db.functions.invoke('comets-invite',{body:{email,role,player_id,redirectTo:'https://storied-muffin-007a38.netlify.app/'}});if(error||data?.error)throw new Error(data?.error||err(error));alert('Invitation sent to '+email)})}
async function importLocal(){alert('Import is not enabled in this test build. Export and keep your existing local backup; no data has been overwritten in Supabase.')}
async function showFeed(){const app=document.getElementById('app');const [posts,likes,comments,profiles]=await Promise.all(['announcements','announcement_likes','announcement_comments','profiles'].map(api));const names=Object.fromEntries(profiles.map(x=>[x.id,x.display_name]));if(posts.length)localStorage.setItem('comets-sideline-seen-'+user.id,posts.reduce((max,p)=>p.created_at>max?p.created_at:max,''));app.innerHTML='<div class="section-head"><h2>THE SIDELINE</h2><button class="secondary" id="feed-back">← BACK</button></div><section class="card"><h3>Share with the team</h3><textarea id="feed-text" placeholder="Team update..."></textarea><button class="primary" id="feed-post">POST</button></section>'+posts.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.created_at.localeCompare(a.created_at)).map(p=>'<section class="card"><div class="club-kicker">'+(p.pinned?'PINNED · ':'')+esc2(names[p.author_id]||'Comets member')+'</div><p>'+esc2(p.body)+'</p><button class="secondary tinybtn" data-like="'+p.id+'">LIKE ('+likes.filter(x=>x.announcement_id===p.id).length+')</button> '+(coach()?'<button class="secondary tinybtn" data-pin="'+p.id+'">PIN</button>':'')+'<div class="mini">'+comments.filter(x=>x.announcement_id===p.id).map(x=>'<p>'+esc2(names[x.author_id]||'Member')+': '+esc2(x.body)+'</p>').join('')+'</div><input data-reply="'+p.id+'" placeholder="Reply"><button class="secondary tinybtn" data-send="'+p.id+'">COMMENT</button></section>').join('');document.getElementById('feed-back').onclick=refresh;document.getElementById('feed-post').onclick=()=>safe(async()=>{const body=val('feed-text');if(!body)return;const {error}=await db.from('announcements').insert({author_id:user.id,body});if(error)throw error;await showFeed()});app.querySelectorAll('[data-like]').forEach(b=>b.onclick=()=>safe(async()=>{const id=b.dataset.like;const exists=likes.some(x=>x.announcement_id===id&&x.user_id===user.id);const q=exists?db.from('announcement_likes').delete().eq('announcement_id',id).eq('user_id',user.id):db.from('announcement_likes').insert({announcement_id:id,user_id:user.id});const {error}=await q;if(error)throw error;await showFeed()}));app.querySelectorAll('[data-send]').forEach(b=>b.onclick=()=>safe(async()=>{const body=app.querySelector('[data-reply="'+b.dataset.send+'"]').value.trim();if(!body)return;const {error}=await db.from('announcement_comments').insert({announcement_id:b.dataset.send,author_id:user.id,body});if(error)throw error;await showFeed()}));app.querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>safe(async()=>{const p=posts.find(x=>x.id===b.dataset.pin);const {error}=await db.from('announcements').update({pinned:!p.pinned,official:true}).eq('id',p.id);if(error)throw error;await showFeed()}))}
// Existing app has its own render. Wrap it, never replace the original tab markup/CSS.
window.render=function(){renderBase();if(ready)enhance()};
async function boot(){
 const loginButton=document.querySelector('#comets-login-form button[type=submit]');
 notice.textContent='Checking your saved sign-in…';
 if(!window.supabase?.createClient){notice.textContent='Unable to load secure login. Check your connection and reload.';return}
 db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'comets-hq-auth'}});
 document.getElementById('comets-login-form').addEventListener('submit',e=>{e.preventDefault();safe(async()=>{loginButton.disabled=true;notice.textContent='Signing in…';try{const {error}=await db.auth.signInWithPassword({email:val('comets-email'),password:val('comets-password')});if(error)throw error;await enter()}finally{loginButton.disabled=false}})});
 db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')login()});
 try{await enter()}catch(e){
  // Network failures must not be mistaken for an expired session.
  wall.hidden=false;document.querySelector('header').style.display='none';
  document.getElementById('app').style.display='none';document.getElementById('tabs').style.display='none';
  notice.textContent='Unable to restore your session. Check your internet connection, then retry.';
  const retry=document.createElement('button');retry.type='button';retry.textContent='RETRY SAVED SIGN-IN';retry.onclick=()=>{retry.remove();notice.textContent='Checking saved sign-in…';enter().catch(()=>{notice.textContent='Still unable to connect. Please try again when online.';notice.after(retry)})};notice.after(retry);
 }
}
boot();
})();
