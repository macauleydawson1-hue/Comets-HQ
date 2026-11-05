/* COMETS HQ live bridge. Original V6.2 HTML/CSS and five-tab render retained. */
(()=>{'use strict';
const URL='https://bdydfdxxjpdkfqhsjbbf.supabase.co', KEY='sb_publishable_MS2Ukw3FYfmmJpnYEdB-UQ_0KUfheP0';
const alert=message=>CometsUI.notify(message);
const confirm=async message=>Boolean(await CometsUI.dialog({title:'Please confirm',message,submit:'Confirm',danger:true}));
const localDate=value=>{const d=new Date(value);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
let entering=null, db,user,role='player',displayName='',myId=null,ready=false,busy=false,dbPlayers=[],dbArchivedPlayers=[],dbFixtures=[],dbSessions=[],dbSelections=[],dbStats=[],dbPrograms=[],dbLogs=[],dbAvailability=[];
const wall=document.getElementById('auth-wall'),notice=document.getElementById('comets-auth-message');
const esc2=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const coach=()=>role==='coach', firstName=()=>displayName.split(/\s+/)[0]|| (coach()?'Coach':'Player'), val=id=>document.getElementById(id)?.value?.trim()||'', err=e=>e?.message||String(e);
const api=async(t)=>{const {data,error}=await db.from(t).select('*');if(error)throw error;return data||[]};
const write=async(t,method,obj,id)=>{let q=db.from(t);q=method==='insert'?q.insert(obj):method==='upsert'?q.upsert(obj):method==='delete'?q.delete().eq('id',id):q.update(obj).eq('id',id);const {error}=await q;if(error)throw error};
const safe=async(fn)=>{
 if(busy)return;
 if(!navigator.onLine){CometsUI.notify('You’re offline. Reconnect before saving.',true);return}
 busy=true;const buttons=[...document.querySelectorAll('main button,.account-mini button,#comets-login-form button,#activation-form button')].filter(b=>!b.disabled);
 buttons.forEach(b=>b.disabled=true);document.getElementById('app').setAttribute('aria-busy','true');
 try{await fn()}catch(e){const message='Unable to complete this action: '+err(e);CometsUI.notify(message,true);if(!wall.hidden)return;notice.textContent=message}
 finally{busy=false;buttons.forEach(b=>b.disabled=false);document.getElementById('app').removeAttribute('aria-busy')}
};
const renderBase=window.render;
function refresh(){if(!ready)return;previewMode=coach()?'coach':'player';if(!coach()){previewPlayerId=myId||'';}window.render();}
function enhance(){
 const current=['gym','workout','nutrition','progress'].includes(state.tab)?'training':['profile','squad'].includes(state.tab)?'team':['sessions','matchstats'].includes(state.tab)?'matches':state.tab;
 document.getElementById('tabs').innerHTML=[['home','Home'],['team','Team'],['matches','Matches'],['stats','Stats'],['training',coach()?'Training':'My Training'],['video','Video']].map(([id,label])=>'<button class="'+(current===id?'active':'')+'" onclick="changeTab(\''+id+'\')">'+label+'</button>').join('');

 document.querySelector('.mode-switch-wrap')?.setAttribute('hidden','');
 const a=document.querySelector('.athlete');if(a)a.textContent=(displayName || (coach()?'COACH DASHBOARD':'PLAYER DASHBOARD')).toUpperCase();
 if(state.tab==='home'){const intro=document.querySelector('#app .dashboard-intro h2');if(intro)intro.textContent='Welcome back, '+firstName();}
 document.getElementById('preview-warning')?.setAttribute('hidden','');
 const app=document.getElementById('app');if(!app)return;
 if(state.tab==='video'){renderVideo(app);CometsUI.polish();return}
 if(state.tab==='access'){if(coach())renderAccess(app);else app.innerHTML='<section class="card"><h2>Coach access required</h2></section>';CometsUI.polish();return}
 if(state.tab==='home'){showSidelinePreview(app);if(coach()){const section=document.createElement('section');section.className='card';section.innerHTML='<h3>Coach administration</h3><p>Issue activation codes for coaches and players.</p><button class="primary" onclick="changeTab(\'access\')">MEMBER ACCESS</button>';app.append(section)}}
 if(state.tab==='stats')renderLiveStats(app);

 if(state.tab==='team'&&coach()&&teamSubtab==='availability'){
   const tabs=app.querySelector('.inner-tabs');while(tabs?.nextElementSibling)tabs.nextElementSibling.remove();
 }
 if(state.tab==='profile'&&coach()){
  const notes=app.querySelector('#profile-notes');if(notes){notes.previousElementSibling?.remove();notes.remove()}
  app.querySelectorAll('details').forEach(d=>d.remove());
  const link=document.createElement('button');link.className='secondary';link.textContent='Edit official stats in Match Centre';link.onclick=()=>changeTab('matches');app.append(link);
 }
 if(state.tab==='matchstats'&&coach()){app.innerHTML='<section class="card"><h2>Official match statistics</h2><p>Use Match Centre to save shared match statistics.</p><button class="primary" onclick="changeTab(\'matches\')">OPEN MATCH CENTRE</button></section>'}
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
 if(coach()&&state.tab==='training')appendAttendance(app);
 CometsUI.polish();

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
 let slot=app.querySelector('.sideline-feature');
 if(!slot){
  slot=document.createElement('section');slot.className='card sideline-feature';
  const links=app.querySelector('.home-links');if(links)links.before(slot);else app.append(slot);
 }

 // Keep the original gold Sideline card in its original homepage position.
 slot.innerHTML='<div class="notice-title"><div><div class="club-kicker">TEAM COMMUNICATION</div><h3>THE SIDELINE</h3></div><button class="secondary tinybtn" id="sideline-all">VIEW ALL</button></div><p class="muted">Loading latest announcement…</p>';
 slot.querySelector('#sideline-all').onclick=()=>safe(showFeed);
 try{
  const {data,error}=await db.from('announcements').select('id,body,author_id,created_at,pinned').order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  if(!slot.isConnected||state.tab!=='home')return;
  const posts=data||[],latest=posts[0],key='comets-sideline-seen-'+user.id;
  const seen=localStorage.getItem(key)||'';
  const unread=posts.filter(p=>p.created_at>seen).length;
  const summary=latest?esc2(latest.body.length>150?latest.body.slice(0,150)+'…':latest.body):'No announcements yet.';
  slot.innerHTML='<div class="notice-title"><div><div class="club-kicker">TEAM COMMUNICATION</div><h3>THE SIDELINE '+(unread?'<span class="sideline-unread">'+unread+' NEW</span>':'')+'</h3></div><button class="secondary tinybtn" id="sideline-all">VIEW ALL</button></div><div class="sideline-latest"><div class="club-kicker">LATEST ANNOUNCEMENT</div><p>'+summary+'</p></div>';
  slot.querySelector('#sideline-all').onclick=()=>safe(showFeed);
 }catch(e){if(slot.isConnected)slot.innerHTML='<h3>THE SIDELINE</h3><p class="muted">Announcements unavailable right now.</p><button class="secondary tinybtn" id="sideline-all">VIEW ALL</button>';slot.querySelector('#sideline-all').onclick=()=>safe(showFeed)}
}
function account(){
 let el=document.getElementById('comets-account');if(!el){el=document.createElement('div');el.id='comets-account';el.className='account-mini';document.querySelector('header').before(el)}
 el.innerHTML='<button class="account-mini-btn" id="acc-btn" aria-expanded="false" aria-controls="acc-panel">ACCOUNT · '+(coach()?'COACH':'PLAYER')+'</button><div id="acc-panel" class="account-mini-menu" hidden><p class="mini">'+esc2(displayName||'Comets member')+' · '+(coach()?'Coach':'Player')+'</p><p class="mini">'+esc2(user.email)+'</p><button class="secondary" id="acc-name">Edit my name</button><button class="secondary" id="acc-sideline">The Sideline — announcements</button><button class="secondary" id="acc-password">Set or change password</button><button class="secondary" id="acc-install">Install app</button><button class="secondary" id="acc-out">Sign out</button>'+(coach()?'<button class="secondary" id="acc-access">Member access</button><button class="secondary" id="acc-invite">Invite by email</button>':'')+'</div>';
 const button=el.querySelector('#acc-btn'),panel=el.querySelector('#acc-panel');button.onclick=()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden))};
 el.querySelector('#acc-sideline').onclick=()=>safe(async()=>{CometsUI.closeAccount();await showFeed()});
 el.querySelector('#acc-out').onclick=()=>safe(async()=>{const {error}=await db.auth.signOut();if(error)throw error;clearClubData();login()});
 el.querySelector('#acc-name').onclick=()=>safe(async()=>{const result=await CometsUI.dialog({title:'Edit your name',fields:[{name:'name',label:'Display name',value:displayName,maxLength:100}]});if(!result)return;const name=result.name.replace(/\s+/g,' ');if(!name)throw new Error('Enter a display name.');const {error}=await db.from('profiles').update({display_name:name}).eq('id',user.id);if(error)throw error;displayName=name;account();refresh();alert('Name updated.')});
 el.querySelector('#acc-password').onclick=()=>safe(async()=>{const result=await CometsUI.dialog({title:'Set your password',fields:[{name:'password',label:'New password (at least 8 characters)',type:'password',minLength:8},{name:'repeat',label:'Repeat new password',type:'password',minLength:8}]});if(!result)return;if(result.password!==result.repeat)throw new Error('The passwords do not match.');const {error}=await db.auth.updateUser({password:result.password});if(error)throw error;alert('Password updated. You can use it next time you sign in.')});
 el.querySelector('#acc-install').onclick=()=>alert(/iPad|iPhone|iPod/.test(navigator.userAgent)?'In Safari, tap Share, then Add to Home Screen.':'Open your browser menu and choose Install app or Add to Home Screen.');
 if(coach()){el.querySelector('#acc-invite').onclick=invite;el.querySelector('#acc-access').onclick=()=>{CometsUI.closeAccount();changeTab('access')}}
}
function clearClubData(){
 window.cometsAttendanceDirty=false;
 dbPlayers=[];dbArchivedPlayers=[];dbFixtures=[];dbSessions=[];dbSelections=[];dbStats=[];dbPrograms=[];dbLogs=[];dbAvailability=[];
 for(const key of ['players','matches','sessions'])club[key]=[];
 for(const key of ['selections','publishedSelections','playerStats','matchPlayerStats','playerTraining'])club[key]={};
 window.cometsLive=true;save();user=null;myId=null;displayName='';
}
function login(){ready=false;document.querySelector('header').style.display='none';document.querySelector('.mode-switch-wrap')?.setAttribute('hidden','');document.getElementById('app').style.display='none';document.getElementById('tabs').style.display='none';document.getElementById('comets-account')?.remove();wall.hidden=false;document.querySelector('.auth-box .athlete')?.remove();notice.textContent='Invitation-only access for Comets players and coaches.'}
async function enter(){if(entering)return entering;entering=enterOnce();try{return await entering}finally{entering=null}}
async function enterOnce(){const {data:{session},error:sessionError}=await db.auth.getSession();if(sessionError)throw sessionError;if(!session?.user)return login();const {data:{user:u},error}=await db.auth.getUser();if(error)throw error;if(!u)return login();user=u;const {data:r,error:re}=await db.from('user_roles').select('role').eq('user_id',u.id).single();if(re)throw re;if(!['coach','player'].includes(r?.role))throw new Error('Your account needs a club role. Please contact your coach.');role=r.role;const {data:profile,error:profileError}=await db.from('profiles').select('display_name').eq('id',u.id).maybeSingle();if(profileError)throw profileError;displayName=(profile?.display_name||u.user_metadata?.display_name||'').trim();const {data:link,error:linkError}=await db.from('player_links').select('player_id').eq('user_id',u.id).maybeSingle();if(linkError)throw linkError;myId=link?.player_id||null;await load();wall.hidden=true;document.querySelector('header').style.display='';document.getElementById('app').style.display='';document.getElementById('tabs').style.display='';ready=true;account();state.tab='home';refresh()}
async function load(){[dbPlayers,dbFixtures,dbSessions,dbSelections,dbStats,dbPrograms,dbLogs,dbAvailability]=await Promise.all(['squad_players','fixtures','training_sessions','team_selections','match_stats','player_programs','player_training','player_availability'].map(api));
 // Keep linked invitation and history rows intact; only active players belong in the squad.
 dbArchivedPlayers=dbPlayers.filter(p=>p.active===false);
 dbPlayers=dbPlayers.filter(p=>p.active!==false);
 // Map the shared data into the original V6.2 view models. Do not erase unrelated local gym logs.
 club.players=dbPlayers.map(p=>({id:p.id,name:p.full_name,position:p.position,jersey:p.jersey_number||'',notes:''}));
 club.matches=dbFixtures.map(f=>({id:f.id,opponent:f.opponent,date:f.match_date,venue:f.venue,us:f.points_for,them:f.points_against}));
 club.sessions=dbSessions.map(s=>({id:s.id,title:'Team training',date:localDate(s.starts_at),time:new Date(s.starts_at).toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'}),venue:s.location,focus:s.notes}));
 club.selections={};club.publishedSelections={};for(const f of dbFixtures){const picks=dbSelections.filter(s=>s.fixture_id===f.id);const key=f.round_label||f.opponent+' '+f.match_date;club.selections[key]=Array(17).fill('');for(const s of picks){const idx=Number(s.position);if(Number.isInteger(idx)&&idx>=0&&idx<17)club.selections[key][idx]=s.player_id}club.publishedSelections[key]=picks.some(s=>s.published)}
 club.playerStats={};club.matchPlayerStats={};for(const s of dbStats){const p=club.playerStats[s.player_id]||={games:0,tries:0,tackles:0,metres:0,errors:0};p.games++;for(const k of ['tries','tackles','metres','errors'])p[k]+=s[k]||0;club.matchPlayerStats[s.fixture_id]||={};club.matchPlayerStats[s.fixture_id][s.player_id]={played:true,...s}}
 if(!coach()&&myId){club.playerTraining={};club.playerTraining[myId]={sessions:dbLogs.filter(x=>x.player_id===myId&&x.kind==='workout').map(x=>({id:x.id,date:x.logged_at.slice(0,10),name:x.details,notes:''})),nutrition:dbLogs.filter(x=>x.player_id===myId&&x.kind==='nutrition').map(x=>({id:x.id,date:x.logged_at.slice(0,10),notes:x.details})),program:dbPrograms.find(x=>x.player_id===myId)?.details||''};}
 window.cometsLive=true;save();}
// Override original mutators so coach writes go to the shared backend; the original cards stay in place.
window.playerAdd=()=>safe(async()=>{if(!coach())return;const name=val('player-name'),position=val('player-pos');if(!name)return alert('Enter a player name');if(dbPlayers.some(p=>p.full_name.toLowerCase()===name.toLowerCase()))return alert('That player is already in the squad.');await write('squad_players','insert',{full_name:name,position});await load();refresh();CometsUI.notify('Saved successfully.')});
window.playerRemove=id=>safe(async()=>{if(!coach()||!await confirm('Archive this player from the active squad? Their invitation, account and historical records will be kept.'))return;await write('squad_players','update',{active:false},id);await load();refresh();CometsUI.notify('Player archived from the active squad.')});
window.profileSave=id=>safe(async()=>{if(!coach())return;if(!val('profile-name'))return alert('Enter a player name.');await write('squad_players','update',{full_name:val('profile-name'),position:val('profile-position'),jersey_number:val('profile-jersey')?Number(val('profile-jersey')):null},id);await load();refresh();CometsUI.notify('Saved successfully.')});
window.matchAdd=()=>safe(async()=>{if(!coach())return;const opponent=val('match-opponent'),match_date=val('match-date');if(!opponent||!match_date)return alert('Enter opponent and date');const x=val('match-us'),y=val('match-them');if(Boolean(x)!==Boolean(y))return alert('Enter both scores or neither');if([x,y].some(v=>v!==''&&(!Number.isInteger(Number(v))||Number(v)<0)))return alert('Scores must be whole numbers of zero or more.');await write('fixtures','insert',{opponent,match_date,venue:val('match-venue'),points_for:x===''?null:Number(x),points_against:y===''?null:Number(y)});await load();refresh();CometsUI.notify('Saved successfully.')});
window.matchDelete=id=>safe(async()=>{if(!coach()||!await confirm('Delete fixture?'))return;await write('fixtures','delete',null,id);await load();refresh();CometsUI.notify('Saved successfully.')});
window.trainingAdd=()=>safe(async()=>{if(!coach())return;const date=val('session-date');if(!date||!val('session-title'))return alert('Enter a session name and date');const time=val('session-time')||'18:00';await write('training_sessions','insert',{starts_at:new Date(date+'T'+time+':00').toISOString(),location:val('session-venue'),notes:[val('session-title'),val('session-focus')].filter(Boolean).join(' — ')});await load();refresh();CometsUI.notify('Saved successfully.')});
window.trainingDelete=id=>safe(async()=>{if(!coach()||!await confirm('Delete training session?'))return;await write('training_sessions','delete',null,id);await load();refresh();CometsUI.notify('Saved successfully.')});
function appendSelections(app){
 const c=document.createElement('section');c.className='card';
 const positions=['Fullback','Wing','Centre','Centre','Wing','Five-eighth','Halfback','Prop','Hooker','Prop','Second row','Second row','Lock','Interchange','Interchange','Interchange','Interchange'];
 c.innerHTML='<div class="club-kicker">MATCH DAY · 17 PLAYERS</div><h2>Team selection</h2><p class="muted">Pick the starting 13 and four interchange. Drafts stay private until published.</p><label>Round / fixture</label><select id="sel-fixture">'+dbFixtures.map(x=>'<option value="'+x.id+'">'+esc2((x.round_label?x.round_label+' · ':'')+x.opponent+' · '+x.match_date)+'</option>').join('')+'</select><div class="selection-count" id="sel-count">0<span> / 17 SELECTED</span></div><div class="selection-heading">STARTING XIII</div><div id="sel-slots"></div><div class="tools"><button class="primary" id="sel-save">SAVE DRAFT</button><button class="secondary" id="sel-publish">PUBLISH TEAM</button></div>';
 app.appendChild(c);
 const draw=()=>{
  const fid=val('sel-fixture');
  const slots=c.querySelector('#sel-slots');
  slots.innerHTML=positions.map((position,i)=>(i===13?'<div class="selection-heading">INTERCHANGE</div>':'')+'<div class="team-slot"><span class="jersey-number">'+(i+1)+'</span><div class="slot-details"><b>'+esc2(position)+'</b><select class="sel-player" data-slot="'+i+'" aria-label="Select '+esc2(position)+'"><option value="">Choose player</option>'+dbPlayers.slice().sort((a,b)=>a.full_name.localeCompare(b.full_name)).map(p=>'<option value="'+p.id+'" '+(dbSelections.some(s=>s.fixture_id===fid&&s.player_id===p.id&&Number(s.position)===i)?'selected':'')+'>'+esc2(p.full_name)+'</option>').join('')+'</select></div></div>').join('');
  const updateCount=()=>{c.querySelector('#sel-count').innerHTML=slots.querySelectorAll('.sel-player').length?Array.from(slots.querySelectorAll('.sel-player')).filter(x=>x.value).length+'<span> / 17 SELECTED</span>':'0<span> / 17 SELECTED</span>'};
  slots.querySelectorAll('.sel-player').forEach(el=>el.onchange=()=>{const chosen=Array.from(slots.querySelectorAll('.sel-player')).filter(x=>x.value===el.value&&x!==el);if(el.value&&chosen.length){alert('That player is already selected.');el.value=''}updateCount()});
  updateCount();
 };
 c.querySelector('#sel-fixture').onchange=draw;draw();if(!dbFixtures.length){c.querySelector('#sel-save').disabled=true;c.querySelector('#sel-publish').disabled=true;const empty=document.createElement('p');empty.className='muted';empty.textContent='Add a fixture in Matches before choosing a team.';c.prepend(empty)}
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
  await load();refresh();CometsUI.notify('Saved successfully.');alert((pub?'Team published':'Draft saved')+noticeWarning);
 });
 c.querySelector('#sel-save').onclick=()=>saveSel(false);
 c.querySelector('#sel-publish').onclick=()=>saveSel(true);
}

function appendAvailability(app){const c=document.createElement('section');c.className='card';c.innerHTML='<h3>LIVE AVAILABILITY</h3>'+(coach()?'<p class="muted">Players are assumed available unless they report otherwise.</p>':'<p class="muted">You are assumed available. Only report a change if you cannot play.</p>')+(!coach()&&!myId?'<p>Your account has not been linked to a squad player yet. Ask a coach.</p>':'')+dbFixtures.map(f=>'<div class="club-row"><b>'+esc2(f.opponent+' · '+f.match_date)+'</b>'+(coach()?'<small>'+esc2(dbAvailability.filter(a=>a.fixture_id===f.id).map(a=>(dbPlayers.find(p=>p.id===a.player_id)?.full_name||'Player')+': '+a.status).join(' · ')||'No responses')+'</small>':'<select data-av="'+f.id+'"><option value="">Choose</option>'+['available','unavailable','unsure'].map(v=>'<option value="'+v+'" '+(dbAvailability.some(a=>a.fixture_id===f.id&&a.player_id===myId&&a.status===v)?'selected':'')+'>'+v+'</option>').join('')+'</select>')+'</div>').join('');app.appendChild(c);if(!coach()&&myId)c.querySelectorAll('[data-av]').forEach(x=>x.onchange=()=>safe(async()=>{const {error}=await db.from('player_availability').upsert({player_id:myId,fixture_id:x.dataset.av,status:x.value||'available'});if(error)throw error;await load();refresh();CometsUI.notify('Saved successfully.')}))}
function appendMatchStats(app){const c=document.createElement('section');c.className='card';c.innerHTML='<h3>OFFICIAL MATCH STATS</h3><p class="muted">Enter match-by-match figures. Player totals update for everyone.</p><select id="stat-fixture">'+dbFixtures.map(f=>'<option value="'+f.id+'">'+esc2(f.opponent+' · '+f.match_date)+'</option>').join('')+'</select><select id="stat-player">'+dbPlayers.map(p=>'<option value="'+p.id+'">'+esc2(p.full_name)+'</option>').join('')+'</select>'+['tries','tackles','metres','errors'].map(k=>'<label>'+k+'</label><input type="number" min="0" id="stat-'+k+'" value="0">').join('')+'<button class="primary" id="stat-save">SAVE MATCH STATS</button>';app.appendChild(c);
 const fillStats=()=>{const entry=dbStats.find(s=>s.fixture_id===val('stat-fixture')&&s.player_id===val('stat-player'));for(const key of ['tries','tackles','metres','errors'])c.querySelector('#stat-'+key).value=entry?.[key]||0};
 c.querySelector('#stat-fixture').onchange=fillStats;c.querySelector('#stat-player').onchange=fillStats;fillStats();
 c.querySelector('#stat-save').disabled=!dbFixtures.length||!dbPlayers.length;
 c.querySelector('#stat-save').onclick=()=>safe(async()=>{const obj={fixture_id:val('stat-fixture'),player_id:val('stat-player')};if(!obj.fixture_id||!obj.player_id)return alert('Choose a fixture and player');for(const k of ['tries','tackles','metres','errors']){const n=Number(val('stat-'+k));if(!Number.isInteger(n)||n<0)throw new Error('Match statistics must be whole numbers of zero or more.');obj[k]=n;}const {error}=await db.from('match_stats').upsert(obj,{onConflict:'fixture_id,player_id'});if(error)throw error;await load();refresh();CometsUI.notify('Saved successfully.')})}
function appendAttendance(app){
 const section=document.createElement('section');section.className='card attendance-card';section.id='attendance-register';
 section.innerHTML='<div class="club-kicker">COACH TOOLS</div><h3>Training attendance</h3><p>Choose a scheduled session or add a training day. All coaches share one register per date.</p><label for="attendance-session">Scheduled training session</label><select id="attendance-session"><option value="manual">Choose a training day directly</option>'+dbSessions.slice().sort((a,b)=>b.starts_at.localeCompare(a.starts_at)).map(s=>'<option value="'+esc2(s.id)+'">'+esc2(new Date(s.starts_at).toLocaleString('en-AU',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'})+' · '+(s.location||'Team training'))+'</option>').join('')+'</select><label for="attendance-day">Training day</label><input id="attendance-day" type="date" value="'+today()+'"><label for="attendance-title">Session name</label><input id="attendance-title" maxlength="120" value="Team training"><p id="attendance-state" role="status">Loading register…</p><div id="attendance-summary" class="attendance-summary"></div><div id="attendance-players"></div><div class="tools"><button class="secondary" id="attendance-present" disabled>MARK ALL PRESENT</button><button class="primary" id="attendance-save" disabled>SAVE ATTENDANCE</button><button class="secondary" id="attendance-reload">RELOAD SAVED REGISTER</button></div>';
 const intro=app.querySelector('.section-head');if(intro)intro.after(section);else app.prepend(section);
 const date=section.querySelector('#attendance-day'),session=section.querySelector('#attendance-session'),title=section.querySelector('#attendance-title'),status=section.querySelector('#attendance-state'),root=section.querySelector('#attendance-players'),summary=section.querySelector('#attendance-summary'),saveButton=section.querySelector('#attendance-save'),allButton=section.querySelector('#attendance-present');
 let revision=0,day=date.value,sessionValue='manual',loadId=0,loaded=false,marks={};
 const names={present:'Present',absent:'Absent',excused:'Excused',unmarked:'Not marked'};
 const changed=()=>{window.cometsAttendanceDirty=true;status.textContent='Unsaved attendance changes.';summarise()};
 function summarise(){summary.textContent='Active squad: '+Object.entries(names).map(([key,label])=>dbPlayers.filter(p=>(marks[p.id]||'unmarked')===key).length+' '+label.toLowerCase()).join(' · ')}
 function draw(){
  root.innerHTML=dbPlayers.length?dbPlayers.slice().sort((a,b)=>a.full_name.localeCompare(b.full_name)).map(p=>'<div class="attendance-row"><div><b>'+esc2(p.full_name)+'</b><small>'+esc2(p.position||'')+'</small></div><div><label for="attendance-'+esc2(p.id)+'">Attendance for '+esc2(p.full_name)+'</label><select id="attendance-'+esc2(p.id)+'" data-attendance-player="'+esc2(p.id)+'">'+Object.entries(names).map(([key,label])=>'<option value="'+key+'" '+((marks[p.id]||'unmarked')===key?'selected':'')+'>'+label+'</option>').join('')+'</select></div></div>').join(''):'<p>Add active players in Team → Squad before marking attendance.</p>';
  const archived=dbArchivedPlayers.filter(p=>marks[p.id]!==undefined);if(archived.length){const history=document.createElement('details');history.innerHTML='<summary>Archived players in this register ('+archived.length+')</summary>'+archived.map(p=>'<p>'+esc2(p.full_name)+' · '+esc2(names[marks[p.id]]||'Not marked')+'</p>').join('');root.append(history)}
  root.querySelectorAll('[data-attendance-player]').forEach(select=>select.onchange=()=>{marks[select.dataset.attendancePlayer]=select.value;changed()});summarise();CometsUI.polish();
 }
 async function readRegister(){
  const request=++loadId;window.cometsAttendanceDirty=false;loaded=false;saveButton.disabled=true;allButton.disabled=true;status.textContent='Loading register…';
  try{
   const {data:register,error}=await db.from('comets_training_days').select('*').eq('attendance_date',day).maybeSingle();if(error)throw error;
   let rows=[];if(register){const response=await db.from('comets_training_attendance').select('*').eq('day_id',register.id);if(response.error)throw response.error;rows=response.data||[]}
   if(!section.isConnected||request!==loadId)return;
   marks=Object.fromEntries(rows.map(r=>[r.player_id,r.status]));revision=register?.revision||0;title.value=register?.title||'Team training';window.cometsAttendanceDirty=false;loaded=true;draw();
   saveButton.disabled=!dbPlayers.length;allButton.disabled=!dbPlayers.length;status.textContent=register?'Saved register loaded. Changes are saved only when you select Save Attendance.':'No attendance saved for this day. Players start as Not marked.';
  }catch{if(request!==loadId||!section.isConnected)return;root.replaceChildren();summary.textContent='';status.textContent='Attendance unavailable. Retry using Reload Saved Register. If this is the first setup, install the attendance SQL in Supabase.'}
 }
 async function discard(){return !window.cometsAttendanceDirty||await confirm('Discard unsaved attendance changes and load another register?')}
 session.onchange=async()=>{const next=session.value;if(!await discard()){session.value=sessionValue;return}sessionValue=next;const scheduled=dbSessions.find(s=>s.id===next);if(scheduled)date.value=localDate(scheduled.starts_at);date.disabled=!!scheduled;day=date.value;await readRegister()};
 date.onchange=async()=>{const next=date.value;if(!next||!await discard()){date.value=day;return}day=next;await readRegister()};
 title.oninput=()=>{if(loaded)changed()};
 allButton.onclick=()=>{if(!loaded)return;dbPlayers.forEach(p=>marks[p.id]='present');draw();changed()};
 section.querySelector('#attendance-reload').onclick=async()=>{if(await discard())await readRegister()};
 saveButton.onclick=()=>safe(async()=>{
  if(!loaded||date.value!==day)return;if(!title.value.trim())throw new Error('Enter a session name.');
  const {data,error}=await db.rpc('comets_save_attendance',{p_day:day,p_title:title.value.trim(),p_revision:revision,p_marks:dbPlayers.map(p=>({player_id:p.id,status:marks[p.id]||'unmarked'}))});
  if(error)throw new Error('Attendance was not saved. '+err(error));if(!data||!Number.isInteger(data.revision))throw new Error('Attendance was not saved. Check the backend setup.');
  revision=data.revision;window.cometsAttendanceDirty=false;status.textContent='Attendance saved for '+new Date(day+'T12:00:00').toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})+'.';alert('Attendance saved.');
 });
 readRegister();
}

function appendTraining(app){
 const c=document.createElement('section');c.className='card';
 if(coach()){
 c.innerHTML='<h3>Assign a player program</h3><p class="muted">Programs are shared with the assigned player and coaches.</p><select id="prog-player">'+dbPlayers.map(p=>'<option value="'+p.id+'">'+esc2(p.full_name)+'</option>').join('')+'</select><input id="prog-title" placeholder="Program title" maxlength="120"><textarea id="prog-details" placeholder="Exercises, sets and instructions" maxlength="10000"></textarea><button class="primary" id="prog-save">ASSIGN PROGRAM</button>';
 if(!dbPlayers.length)c.innerHTML='<h3>Player programs</h3><p>Add squad players in Team before assigning a program.</p><button class="primary" onclick="teamSection(\'squad\')">ADD PLAYERS</button>';
 app.append(c);const saveButton=c.querySelector('#prog-save');if(saveButton)saveButton.onclick=()=>safe(async()=>{if(!val('prog-player')||!val('prog-title')||!val('prog-details'))return alert('Choose a player and enter the program title and instructions.');await write('player_programs','insert',{player_id:val('prog-player'),title:val('prog-title'),details:val('prog-details')});await load();refresh();alert('Program assigned.')});
 }else{
 c.innerHTML='<h3>My private training log</h3>'+(myId?'<select id="log-type"><option value="workout">Workout</option><option value="nutrition">Nutrition</option><option value="progress">Progress</option></select><textarea id="log-details" placeholder="What did you complete?" maxlength="5000"></textarea><label for="log-weight">Current weight (kg, optional)</label><input id="log-weight" type="number" min="1" max="500" step="0.1"><button class="primary" id="log-save">SAVE PRIVATE LOG</button>':'<p>Ask a coach to link your account to your squad profile to begin logging.</p>');app.append(c);
 if(myId)c.querySelector('#log-save').onclick=()=>safe(async()=>{if(!val('log-details'))return alert('Describe your workout, nutrition or progress.');const weight=val('log-weight')?Number(val('log-weight')):null;if(weight!==null&&(!Number.isFinite(weight)||weight<=0||weight>500))return alert('Enter a weight between 1 and 500 kg.');await write('player_training','insert',{player_id:myId,kind:val('log-type'),details:val('log-details'),weight_kg:weight});await load();refresh();alert('Training entry saved.')});
 const programs=document.createElement('section');programs.className='card';programs.innerHTML='<h3>My assigned programs</h3>'+ (dbPrograms.filter(x=>x.player_id===myId).map(x=>'<div class="club-row history-entry"><div><h4>'+esc2(x.title)+'</h4><p>'+esc2(x.details)+'</p></div></div>').join('')||'<p class="muted">Your coach’s assigned programs will appear here.</p>');app.append(programs);
 const logs=document.createElement('section');logs.className='card';logs.innerHTML='<h3>Training history</h3>'+(dbLogs.filter(x=>x.player_id===myId).sort((a,b)=>b.logged_at.localeCompare(a.logged_at)).map(x=>'<article class="history-entry"><h4>'+esc2(x.kind)+'</h4><time datetime="'+esc2(x.logged_at)+'">'+esc2(new Date(x.logged_at).toLocaleString('en-AU',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}))+'</time><p>'+esc2(x.details)+'</p>'+(x.weight_kg?'<p class="mini">Weight: '+esc2(x.weight_kg)+' kg</p>':'')+'<div class="tools"><button class="secondary" data-log-edit="'+esc2(x.id)+'">Edit entry</button><button class="secondary" data-log-delete="'+esc2(x.id)+'">Delete entry</button></div></article>').join('')||'<p class="muted">No entries yet. Save your first entry above.</p>');app.append(logs);
 logs.querySelectorAll('[data-log-edit]').forEach(b=>b.onclick=()=>safe(async()=>{const entry=dbLogs.find(x=>x.id===b.dataset.logEdit&&x.player_id===myId);if(!entry)return;const result=await CometsUI.dialog({title:'Edit training entry',fields:[{name:'details',label:'Entry details',value:entry.details,multiline:true,maxLength:5000}]});if(!result)return;if(!result.details)throw new Error('Enter your training details.');const {error}=await db.from('player_training').update({details:result.details}).eq('id',entry.id).eq('player_id',myId);if(error)throw error;await load();refresh();alert('Entry updated.')}));
 logs.querySelectorAll('[data-log-delete]').forEach(b=>b.onclick=()=>safe(async()=>{if(!await confirm('Delete this training entry?'))return;const {error}=await db.from('player_training').delete().eq('id',b.dataset.logDelete).eq('player_id',myId);if(error)throw error;await load();refresh();alert('Entry deleted.')}));
 }
}
async function invite(){if(!coach())return;await safe(async()=>{
 const result=await CometsUI.dialog({title:'Invite a club member',submit:'Send invitation',fields:[{name:'email',label:'Email address',type:'email'},{name:'role',label:'Club role',options:[['player','Player'],['coach','Coach']]},{name:'player',label:'Linked squad player (required for players)',required:false,options:[['','Choose a player'],...dbPlayers.map(p=>[p.id,p.full_name])]}]});
 if(!result)return;if(result.role==='player'&&!result.player)throw new Error('Choose a squad player for this account.');
 const {data,error}=await db.functions.invoke('comets-invite',{body:{email:result.email,role:result.role,player_id:result.role==='player'?result.player:null,redirectTo:new window.URL('./',location.href).href}});
 if(error||data?.error)throw new Error(data?.error||err(error));alert('Invitation sent to '+result.email);
})}
async function importLocal(){alert('Import is not enabled in this test build. Export and keep your existing local backup; no data has been overwritten in Supabase.')}
async function showFeed(){const app=document.getElementById('app');const [posts,likes,comments,profiles]=await Promise.all(['announcements','announcement_likes','announcement_comments','profiles'].map(api));const names=Object.fromEntries(profiles.map(x=>[x.id,x.display_name]));if(posts.length)localStorage.setItem('comets-sideline-seen-'+user.id,posts.reduce((max,p)=>p.created_at>max?p.created_at:max,''));app.innerHTML='<div class="section-head"><h2>THE SIDELINE</h2><button class="secondary" id="feed-back">← BACK</button></div><section class="card"><h3>Share with the team</h3><textarea id="feed-text" placeholder="Team update..."></textarea><button class="primary" id="feed-post">POST</button></section>'+posts.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.created_at.localeCompare(a.created_at)).map(p=>'<section class="card"><div class="club-kicker">'+(p.pinned?'PINNED · ':'')+esc2(names[p.author_id]||'Comets member')+'</div><p>'+esc2(p.body)+'</p><button class="secondary tinybtn" data-like="'+p.id+'">LIKE ('+likes.filter(x=>x.announcement_id===p.id).length+')</button> '+(coach()?'<button class="secondary tinybtn" data-pin="'+p.id+'">PIN</button>':'')+(coach()||p.author_id===user.id?'<button class="secondary tinybtn" data-delete-post="'+p.id+'">DELETE</button>':'')+'<div class="mini">'+comments.filter(x=>x.announcement_id===p.id).map(x=>'<p>'+esc2(names[x.author_id]||'Member')+': '+esc2(x.body)+'</p>').join('')+'</div><input data-reply="'+p.id+'" placeholder="Reply"><button class="secondary tinybtn" data-send="'+p.id+'">COMMENT</button></section>').join('');document.getElementById('feed-back').onclick=refresh;document.getElementById('feed-post').onclick=()=>safe(async()=>{const body=val('feed-text');if(!body)return;const {error}=await db.from('announcements').insert({author_id:user.id,body});if(error)throw error;await showFeed()});app.querySelectorAll('[data-like]').forEach(b=>b.onclick=()=>safe(async()=>{const id=b.dataset.like;const exists=likes.some(x=>x.announcement_id===id&&x.user_id===user.id);const q=exists?db.from('announcement_likes').delete().eq('announcement_id',id).eq('user_id',user.id):db.from('announcement_likes').insert({announcement_id:id,user_id:user.id});const {error}=await q;if(error)throw error;await showFeed()}));app.querySelectorAll('[data-send]').forEach(b=>b.onclick=()=>safe(async()=>{const body=app.querySelector('[data-reply="'+b.dataset.send+'"]').value.trim();if(!body)return;const {error}=await db.from('announcement_comments').insert({announcement_id:b.dataset.send,author_id:user.id,body});if(error)throw error;await showFeed()}));app.querySelectorAll('[data-delete-post]').forEach(b=>b.onclick=()=>safe(async()=>{
 const post=posts.find(p=>p.id===b.dataset.deletePost);if(!post||(!coach()&&post.author_id!==user.id))return;
 if(!await confirm('Delete this announcement and its replies? This cannot be undone.'))return;
 const {data,error}=await db.rpc('comets_delete_announcement',{p_post_id:post.id});if(error)throw new Error('Announcement could not be deleted. '+err(error));
 if(data!==true)throw new Error('This announcement was already removed or you do not have permission to delete it.');
 await showFeed();alert('Announcement deleted.');
}));app.querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>safe(async()=>{const p=posts.find(x=>x.id===b.dataset.pin);const {error}=await db.from('announcements').update({pinned:!p.pinned,official:true}).eq('id',p.id);if(error)throw error;await showFeed()}))}
// Existing app has its own render. Wrap it, never replace the original tab markup/CSS.
function liveTeam(){
 if(!['squad','selection'].includes(teamSubtab))teamSubtab='squad';
 return '<div class="section-head"><div class="club-kicker">FIRST GRADE</div><h2>TEAM</h2></div><div class="inner-tabs">'+[['squad','SQUAD'],['selection','TEAM SELECTION']].map(([id,label])=>'<button class="'+(teamSubtab===id?'active':'')+'" onclick="teamSection(\''+id+'\')">'+label+'</button>').join('')+'</div>'+(teamSubtab==='squad'?squadView().replace(/>Remove<\/button>/g,'>Archive</button>'):'');
}
// Route signed-in screens explicitly. Legacy render wrappers must not decide
// which club page is displayed or fall through to the personal progress page.
window.render=function(){
 if(!ready){renderBase();return}
 previewMode=coach()?'coach':'player';if(!coach())previewPlayerId=myId||'';
 const pages=coach()?{home,team:liveTeam,squad:squadView,matches:matchesView,sessions:sessionsView,profile:profileView,video:()=>'',training:trainingHub,playerprograms:()=>'',stats:()=>'',access:()=>'',matchstats:()=>'',backup:backupView,gym:workouts,workout:workoutView,nutrition,progress}:{home:playerHome,team:playerTeam,matches:playerMatches,stats:()=>'',video:()=>'',training:()=>''};
 const page=pages[state.tab];if(!page)state.tab='home';
 document.getElementById('app').innerHTML=(page||pages.home)();
 const totals=matchStats();document.getElementById('club-stats').innerHTML='<div class="stat"><strong>'+esc2(club.season)+'</strong><small>Season</small></div><div class="stat"><strong>1ST GRADE</strong><small>Division</small></div><div class="stat"><strong>'+totals.w+'–'+totals.l+'–'+totals.d+'</strong><small>W–L–D</small></div>';
 enhance();
};
const originalChangeTab=window.changeTab;
window.changeTab=async function(tab){if(window.cometsAttendanceDirty&&!await confirm('Leave Training and discard unsaved attendance changes?'))return;window.cometsAttendanceDirty=false;originalChangeTab(tab)};
addEventListener('beforeunload',event=>{if(window.cometsAttendanceDirty){event.preventDefault();event.returnValue=''}});
async function boot(){
 activationForm();
 const loginButton=document.querySelector('#comets-login-form button[type=submit]');
 notice.textContent='Checking your saved sign-in…';
 if(!window.supabase?.createClient){notice.textContent='Secure sign-in is unavailable. Reconnect to the internet and reload.';loginButton.disabled=true;const retry=document.createElement('button');retry.type='button';retry.textContent='RELOAD SIGN-IN';retry.onclick=()=>location.reload();notice.after(retry);return}
 db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'comets-hq-auth'}});
 document.getElementById('comets-login-form').addEventListener('submit',e=>{e.preventDefault();safe(async()=>{loginButton.disabled=true;notice.textContent='Signing in…';try{const {error}=await db.auth.signInWithPassword({email:val('comets-email'),password:document.getElementById('comets-password').value});if(error)throw error;await enter();document.getElementById('comets-password').value=''}catch(e){notice.textContent='Sign-in failed. Check your details and connection, then try again.';throw e}finally{loginButton.disabled=false}})});
 db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){clearClubData();login()}});
 try{await enter()}catch(e){
  // Network failures must not be mistaken for an expired session.
  wall.hidden=false;document.querySelector('header').style.display='none';
  document.getElementById('app').style.display='none';document.getElementById('tabs').style.display='none';
  notice.textContent='Unable to restore your session. Check your internet connection, then retry.';
  const retry=document.createElement('button');retry.type='button';retry.textContent='RETRY SAVED SIGN-IN';retry.onclick=()=>{retry.remove();notice.textContent='Checking saved sign-in…';enter().catch(()=>{notice.textContent='Still unable to connect. Please try again when online.';notice.after(retry)})};notice.after(retry);
 }
}
async function accessRequest(body){
 const {data,error}=await db.functions.invoke('comets-access',{body});
 if(error){let message='Member access is unavailable. Ask the project administrator to check the activation setup.';try{const detail=await error.context?.json();if(detail?.error)message=detail.error}catch{}throw new Error(message)}
 if(data?.error)throw new Error(data.error);
 const valid=body.action==='list'?Array.isArray(data?.codes):body.action==='issue'?typeof data?.code==='string'&&!!data?.expires_at:data?.ok===true;
 if(!valid)throw new Error('The activation service is not installed correctly. Ask the project administrator to deploy the comets-access function code.');return data;
}
async function renderVideo(app){
 const isCoach=coach();
 app.innerHTML='<div class="section-head"><div class="club-kicker">FIRST GRADE · GAME REVIEW</div><h2>VIDEO</h2><p>'+ (isCoach?'Add YouTube game clips, write your analysis and publish to the squad.':'Game-week clips and analysis from your coaching staff.')+'</p></div>'+(isCoach?'<section class="card"><h3>Add a game video</h3><label for="video-source">Video source</label><select id="video-source"><option value="youtube">YouTube link</option><option value="upload">Upload a video file</option></select><label for="video-title">Clip title</label><input id="video-title" maxlength="120" placeholder="e.g. Goal-line defence"><label for="video-week">Game week / round</label><input id="video-week" maxlength="100" placeholder="e.g. Round 3 · vs Eels"><label for="video-date">Match date (optional)</label><input id="video-date" type="date"><div id="video-youtube-fields"><label for="video-youtube">YouTube video link</label><input id="video-youtube" type="url" placeholder="https://www.youtube.com/watch?v=…"><p class="mini">Enable embedding in YouTube. Unlisted videos are accessible to anyone with their link; they are not private club storage.</p></div><div id="video-upload-fields" hidden><label for="video-file">Video clip</label><input id="video-file" type="file" accept="video/mp4,video/webm,video/quicktime"><p class="mini">Maximum 50 MB per clip. MP4 (H.264/AAC) is recommended for phones and computers. Trim full-match footage into short clips before uploading.</p></div><label for="video-analysis">Coaching analysis</label><textarea id="video-analysis" maxlength="10000" placeholder="What went well, what to improve, and key moments (e.g. 00:15 — defensive spacing)."></textarea><div class="tools"><button class="primary" id="video-upload">SAVE AS DRAFT</button></div><p class="mini" id="video-upload-status" role="status"></p></section>':'')+'<section class="card video-filter"><label for="video-week-filter">Game week</label><select id="video-week-filter"><option value="">All game weeks</option></select></section><div id="video-list" aria-live="polite">Loading game clips…</div>';
 const list=app.querySelector('#video-list'),filter=app.querySelector('#video-week-filter');let videos=[];
 const bucket=()=>db.storage.from('comets-game-video');
 const check=async promise=>{const {data,error}=await promise;if(error)throw error;return data};
 async function loadVideos(){
  try{
   let query=db.from('comets_game_videos').select('*').order('created_at',{ascending:false});if(!isCoach)query=query.eq('published',true);
   videos=await check(query)||[];if(!list.isConnected)return;
   const selected=filter.value;filter.innerHTML='<option value="">All game weeks</option>'+[...new Set(videos.map(v=>v.game_week))].map(w=>'<option value="'+esc2(w)+'">'+esc2(w)+'</option>').join('');filter.value=selected;draw();
  }catch(e){if(!list.isConnected)return;list.innerHTML='<section class="card"><h3>Video unavailable</h3><p>Unable to load game clips. Please retry. If this is the first setup, the project administrator needs to install the video database and storage configuration.</p><button class="secondary" id="video-retry">RETRY</button></section>';list.querySelector('#video-retry').onclick=loadVideos}
 }
 function draw(){
  const visible=videos.filter(v=>!filter.value||v.game_week===filter.value);
  list.innerHTML=visible.length?visible.map(v=>'<article class="card video-card" data-video-id="'+esc2(v.id)+'"><div class="club-kicker">'+esc2(v.game_week)+(isCoach?' · '+(v.published?'PUBLISHED':'DRAFT'):'')+'</div><h3>'+esc2(v.title)+'</h3>'+(v.match_date?'<p class="mini">'+esc2(new Date(v.match_date+'T12:00:00').toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}))+'</p>':'')+'<div class="video-player"><button class="secondary" data-play="'+esc2(v.id)+'">LOAD CLIP</button></div><h4>Coach’s analysis</h4><p class="video-analysis">'+esc2(v.analysis||'No additional analysis for this clip.')+'</p>'+(isCoach?'<div class="tools"><button class="secondary" data-edit-video="'+esc2(v.id)+'">EDIT ANALYSIS</button><button class="primary" data-publish-video="'+esc2(v.id)+'">'+(v.published?'UNPUBLISH':'PUBLISH TO PLAYERS')+'</button><button class="secondary" data-delete-video="'+esc2(v.id)+'">DELETE CLIP</button></div>':'')+'</article>').join(''):'<section class="card"><h3>'+ (isCoach?'No clips yet':'No published clips yet')+'</h3><p>'+ (isCoach?'Add your first game video above, then publish it when the analysis is ready.':'Your coaching staff’s game-week analysis will appear here once published.')+'</p></section>';
  list.querySelectorAll('[data-play]').forEach(b=>b.onclick=async()=>{
   b.disabled=true;try{const v=videos.find(v=>v.id===b.dataset.play);const youtube=CometsVideo.youtubeReferenceId(v.object_path);
   if(youtube){
    const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+youtube;frame.title=v.title;frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
    const link=document.createElement('a');link.href='https://www.youtube.com/watch?v='+youtube;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open in YouTube';
    const note=document.createElement('p');note.className='mini';note.textContent='If playback is unavailable here, open in YouTube. The owner may have disabled embedding or restricted the video.';
    b.after(frame,note,link);b.hidden=true;return;
   }
   const signed=await check(bucket().createSignedUrl(v.object_path,300));if(!b.isConnected)return;
   const player=document.createElement('video');player.controls=true;player.playsInline=true;player.preload='metadata';player.src=signed.signedUrl;player.setAttribute('aria-label',v.title);
   const retry=document.createElement('button');retry.className='secondary';retry.textContent='RELOAD CLIP';retry.onclick=()=>{player.remove();retry.remove();b.hidden=false;b.click()};player.onerror=()=>{retry.hidden=false;CometsUI.notify('Unable to play this clip. Reload it, or ask your coach for an MP4 version.',true)};retry.hidden=true;b.after(player,retry);b.hidden=true;
   }catch{CometsUI.notify('Unable to load this clip. Check your connection and try again.',true)}finally{b.disabled=false}
  });
  list.querySelectorAll('[data-edit-video]').forEach(b=>b.onclick=()=>safe(async()=>{
   const v=videos.find(v=>v.id===b.dataset.editVideo);const result=await CometsUI.dialog({title:'Edit game analysis',fields:[{name:'title',label:'Clip title',value:v.title,maxLength:120},{name:'week',label:'Game week / round',value:v.game_week,maxLength:100},{name:'analysis',label:'Coaching analysis',value:v.analysis,multiline:true,maxLength:10000,required:false}]});if(!result)return;
   const rows=await check(db.from('comets_game_videos').update({title:result.title,game_week:result.week,analysis:result.analysis}).eq('id',v.id).select('id'));if(!rows?.length)throw new Error('Clip was removed or permission was denied.');await loadVideos();alert('Analysis saved.');
  }));
  list.querySelectorAll('[data-publish-video]').forEach(b=>b.onclick=()=>safe(async()=>{
   const v=videos.find(v=>v.id===b.dataset.publishVideo);if(!await confirm(v.published?'Hide this clip from players?':'Publish this clip and analysis to all players?'))return;
   const rows=await check(db.from('comets_game_videos').update({published:!v.published}).eq('id',v.id).select('id'));if(!rows?.length)throw new Error('Clip was removed or permission was denied.');await loadVideos();alert(v.published?'Clip unpublished.':'Clip published to players.');
  }));
  list.querySelectorAll('[data-delete-video]').forEach(b=>b.onclick=()=>safe(async()=>{
   const v=videos.find(v=>v.id===b.dataset.deleteVideo);if(!await confirm('Delete this clip and its analysis? This cannot be undone.'))return;
   const rows=await check(db.from('comets_game_videos').delete().eq('id',v.id).select('id'));if(!rows?.length)throw new Error('Clip was removed or permission was denied.');
   if(CometsVideo.youtubeReferenceId(v.object_path)){await loadVideos();alert('Video removed from COMETS HQ. The original remains on YouTube.');return}
   const {error}=await bucket().remove([v.object_path]);await loadVideos();if(error)CometsUI.notify('Clip removed from the library. Its stored file needs cleanup by the project administrator.',true);else alert('Clip deleted.');
  }));
  CometsUI.polish();
 }
 filter.onchange=draw;
 if(isCoach){const source=app.querySelector('#video-source');source.onchange=()=>{const youtube=source.value==='youtube';app.querySelector('#video-youtube-fields').hidden=!youtube;app.querySelector('#video-upload-fields').hidden=youtube};}

 if(isCoach)app.querySelector('#video-upload').onclick=()=>safe(async()=>{
  const title=val('video-title'),week=val('video-week'),file=app.querySelector('#video-file').files[0];
  if(!title||!week)throw new Error('Enter the video title and game week.');
  if(val('video-source')==='youtube'){
   const id=CometsVideo.youtubeId(val('video-youtube'));if(!id)throw new Error('Enter a valid YouTube watch, share, Shorts or live-video link.');
   // Existing owner-prefixed metadata reference preserves deployed insert policies.
   // The reserved youtube namespace is a reference, not a Storage object.
   await check(db.from('comets_game_videos').insert({title,game_week:week,match_date:val('video-date')||null,analysis:val('video-analysis'),object_path:user.id+'/youtube/'+id+'/'+crypto.randomUUID(),published:false,created_by:user.id}));
   for(const field of ['video-title','video-week','video-date','video-analysis','video-youtube'])app.querySelector('#'+field).value='';
   app.querySelector('#video-upload-status').textContent='YouTube video saved as a draft. Review the analysis, then publish to players.';await loadVideos();alert('YouTube video saved as a draft.');return;
  }
  if(!file)throw new Error('Select a video file.');
  const extension={'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'}[file.type];if(!extension||file.size===0||file.size>50*1024*1024)throw new Error('Choose an MP4, WebM or MOV clip up to 50 MB.');
  const path=user.id+'/'+crypto.randomUUID()+'.'+extension,status=app.querySelector('#video-upload-status');status.textContent='Uploading clip… Keep this page open.';
  let uploaded=false,saved=false;
  try{
   await check(bucket().upload(path,file,{contentType:file.type,upsert:false}));uploaded=true;
   await check(db.from('comets_game_videos').insert({title,game_week:week,match_date:val('video-date')||null,analysis:val('video-analysis'),object_path:path,published:false,created_by:user.id}));saved=true;
   if(!status.isConnected)return;
   for(const id of ['video-title','video-week','video-date','video-analysis','video-file'])app.querySelector('#'+id).value='';status.textContent='Draft uploaded. Add or review the analysis, then publish it to players.';await loadVideos();alert('Clip uploaded as a private draft.');
  }catch(e){if(uploaded&&!saved){const {error}=await bucket().remove([path]);if(error){status.textContent='Upload was not saved. An unused file needs cleanup by the project administrator.';throw new Error('Video details could not be saved; unused file cleanup also failed. Contact the project administrator.')}}status.textContent='Upload failed. Your details have been kept; please retry.';throw e}
 });
 await loadVideos();
}

async function renderAccess(app){
 if(!coach())return;
 app.innerHTML='<div class="section-head"><div class="club-kicker">COACH ADMINISTRATION</div><h2>MEMBER ACCESS</h2><p>Create one-time activation codes for coaches and players. Codes expire after 24 hours.</p></div><section class="card"><h3>Create an activation code</h3><p>Assign the role here. The member cannot change it during activation.</p><label for="access-name">Member name</label><input id="access-name" maxlength="100" autocomplete="name"><label for="access-email">Member email</label><input id="access-email" type="email" autocomplete="email"><label for="access-role">Access level</label><select id="access-role"><option value="player">Player</option><option value="coach">Coach — includes member administration</option></select><label for="access-player">Squad player (players only — leave blank for coaches)</label><select id="access-player"><option value="">Choose a player</option>'+dbPlayers.map(p=>'<option value="'+esc2(p.id)+'">'+esc2(p.full_name)+'</option>').join('')+'</select><div class="tools"><button class="primary" id="access-issue">GENERATE CODE</button></div><div id="access-code"></div></section><section class="card"><h3>Recent activation codes</h3><p>Revoking an unused code prevents activation. It does not disable an existing account.</p><div id="access-list" role="status">Loading…</div></section>';
 const roleSelect=app.querySelector('#access-role'),playerSelect=app.querySelector('#access-player');roleSelect.onchange=()=>{playerSelect.disabled=roleSelect.value==='coach';if(playerSelect.disabled)playerSelect.value=''};
 const list=app.querySelector('#access-list');
 app.querySelector('#access-issue').onclick=()=>safe(async()=>{
 const email=app.querySelector('#access-email');if(!email.value||!email.reportValidity()||!val('access-name'))throw new Error('Enter the member’s name and valid email address.');
 if(val('access-role')==='player'&&!val('access-player'))throw new Error('Choose the linked squad player.');
 const result=await accessRequest({action:'issue',name:val('access-name'),email:val('access-email'),role:val('access-role'),player_id:val('access-role')==='coach'?null:val('access-player')||null});
 const box=app.querySelector('#access-code');box.innerHTML='<h3>Share this code privately</h3><p>This code is shown only here. The member must use the email you entered and choose a password.</p><label for="activation-result">One-time activation code</label><input id="activation-result" readonly><p class="mini" id="activation-expiry"></p><button class="secondary" id="access-copy">COPY CODE</button>';
 box.querySelector('input').value=result.code;box.querySelector('#activation-expiry').textContent='Expires '+new Date(result.expires_at).toLocaleString('en-AU');
 box.querySelector('#access-copy').onclick=async()=>{try{await navigator.clipboard.writeText(result.code);alert('Code copied.')}catch{box.querySelector('input').select();alert('Select and copy the code above.')}};
 await listCodes();CometsUI.polish();
 });
 async function listCodes(){try{
 const {codes}=await accessRequest({action:'list'});if(!list.isConnected)return;
 list.innerHTML=codes.length?codes.map(c=>{const status=c.status==='pending'&&new Date(c.expires_at)<new Date()?'expired':c.status;return '<div class="club-row"><div><b>'+esc2(c.display_name)+'</b><p class="mini">'+esc2(c.email)+' · '+esc2(c.role)+' · '+esc2(status)+'</p></div>'+(status==='pending'?'<button class="secondary" data-revoke="'+esc2(c.id)+'">REVOKE CODE</button>':'')+'</div>'}).join(''):'<p>No activation codes yet.</p>';
 list.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=()=>safe(async()=>{if(!await confirm('Revoke this unused activation code?'))return;await accessRequest({action:'revoke',id:b.dataset.revoke});await listCodes();alert('Code revoked.')}));
 }catch(e){list.textContent=err(e);const retry=document.createElement('button');retry.className='secondary';retry.textContent='RETRY';retry.onclick=listCodes;list.append(retry)}}
 await listCodes();CometsUI.polish();
}
function activationForm(){
 const form=document.getElementById('comets-login-form');
 const toggle=document.createElement('button');toggle.type='button';toggle.className='secondary';toggle.id='activate-toggle';toggle.textContent='I HAVE AN ACTIVATION CODE';toggle.setAttribute('aria-expanded','false');
 const panel=document.createElement('form');panel.id='activation-form';panel.hidden=true;
 panel.innerHTML='<h3>Activate your membership</h3><p>Use the email and one-time code supplied by your coach. You will sign in with your email and password after activation.</p><label for="activation-email">Invited email address</label><input id="activation-email" type="email" autocomplete="email" required><label for="activation-code">One-time code</label><input id="activation-code" autocomplete="off" spellcheck="false" autocapitalize="characters" required maxlength="64"><label for="activation-password">Choose a password (12–128 characters)</label><input id="activation-password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><label for="activation-repeat">Repeat password</label><input id="activation-repeat" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><button type="submit">ACTIVATE ACCOUNT</button>';
 form.after(toggle,panel);
 toggle.onclick=()=>{panel.hidden=!panel.hidden;form.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));toggle.textContent=panel.hidden?'I HAVE AN ACTIVATION CODE':'BACK TO SIGN IN';if(!panel.hidden)panel.querySelector('input').focus()};
 panel.onsubmit=e=>{e.preventDefault();safe(async()=>{
 const password=panel.querySelector('#activation-password').value;if(password!==panel.querySelector('#activation-repeat').value)throw new Error('The passwords do not match.');
 await accessRequest({action:'redeem',code:val('activation-code'),email:val('activation-email'),password});
 document.getElementById('comets-email').value=val('activation-email');panel.reset();panel.hidden=true;form.hidden=false;toggle.textContent='I HAVE AN ACTIVATION CODE';toggle.setAttribute('aria-expanded','false');notice.textContent='Account activated. Sign in with your email and new password.';document.getElementById('comets-password').focus();
 })};
}

boot();
})();
