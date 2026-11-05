/* Run with Node and Playwright installed: node tests/browser.cjs.
   All backend calls are simulated; this suite never contacts production. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let file=path.join(root,new URL(req.url,'http://local').pathname);if(file.endsWith('/'))file+='index.html';fs.readFile(file,(e,data)=>{res.statusCode=e?404:200;res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.webmanifest')?'application/manifest+json':'text/html');res.end(e?'Missing':data)})});
function mock(role){
 const records={squad_players:[{id:'p1',full_name:'Alex A Very Long Player Name',position:'Second row'}],fixtures:[{id:'f1',opponent:'A Very Long Opposition Club',match_date:'2027-03-20',points_for:null,points_against:null}],training_sessions:[{id:'s1',starts_at:'2027-03-20T20:30:00Z',location:'Home ground',notes:'Skills'}],player_training:[{id:'l1',player_id:'p1',kind:'workout',logged_at:'2027-03-20T20:30:00Z',details:'Completed strength training',weight_kg:90}],player_programs:[{id:'pr1',player_id:'p1',title:'Strength program',details:'Squats\n3 × 8'}],team_selections:[{id:'ts1',player_id:'p1',fixture_id:'f1',position:0,published:true}],match_stats:[],player_availability:[],announcements:[{id:'post1',author_id:'u1',body:'My team announcement',created_at:'2027-03-20T20:30:00Z',pinned:false},{id:'post2',author_id:'other',body:'Another member announcement',created_at:'2027-03-19T20:30:00Z',pinned:false}],profiles:[],announcement_likes:[],announcement_comments:[]};
 window.testWrites=[];window.testFail=false;window.authCallback=()=>{};
 window.supabase={createClient:()=>({rpc:async(name,args)=>{window.testWrites.push({table:'announcements',method:'rpc',args});records.announcements=records.announcements.filter(p=>p.id!==args.p_post_id);return {data:true}},auth:{getSession:async()=>({data:{session:{user:{id:'u1'}}}}),getUser:async()=>({data:{user:{id:'u1',email:'member@example.invalid',user_metadata:{}}}}),onAuthStateChange:f=>window.authCallback=f,signOut:async()=>{window.authCallback('SIGNED_OUT');return {}},updateUser:async x=>{window.testPassword=x.password;return {}}},functions:{invoke:async(n,args)=>{if(n==='comets-access'){window.accessCall=args.body;return {data:args.body.action==='list'?{codes:[{id:'code1',email:'new@example.invalid',display_name:'New Player',role:'player',status:'pending',expires_at:'2099-01-01'}]}:args.body.action==='issue'?{code:'ABCD-EF01-2345-6789-ABCD-EF01-2345-6789',expires_at:'2099-01-01'}:{ok:true}}}window.invitation=args.body;return {data:{}}}},from:table=>{
 let method='select',payload,filters=[];const q={select:()=>q,eq:(key,v)=>{filters.push([key,v]);return q},order:()=>q,limit:()=>q,insert:o=>{method='insert';payload=o;return q},upsert:o=>{method='upsert';payload=o;return q},update:o=>{method='update';payload=o;return q},delete:()=>{method='delete';return q},single:async()=>({data:{role}}),maybeSingle:async()=>({data:table==='profiles'?{display_name:'Alex'}:{player_id:'p1'}}),then:resolve=>new Promise(r=>setTimeout(()=>{
 if(method!=='select'){
 window.testWrites.push({table,method,payload});if(window.testFail){r({error:{message:'Simulated network failure'}});return}
 if(table==='player_training'&&method==='insert')records[table].push({...payload,id:'new-log',logged_at:new Date().toISOString()});
 if(['player_training','squad_players'].includes(table)&&method==='update')records[table]=records[table].map(x=>filters.every(([k,v])=>x[k]===v)?{...x,...payload}:x);
 if(table==='player_training'&&method==='delete')records[table]=records[table].filter(x=>!filters.every(([k,v])=>x[k]===v));
 }
 r({data:records[table]||[],error:null});},40)).then(resolve)};return q;
 }})};
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let screens=0;
 try{
 for(const role of ['coach','player'])for(const width of [320,390,768,1440]){
 const page=await browser.newPage({viewport:{width,height:844},timezoneId:'Australia/Sydney',serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
 await page.route('https://**/*',route=>route.request().url().includes('cdn.jsdelivr.net')?route.fulfill({contentType:'application/javascript',body:'('+mock.toString()+')('+JSON.stringify(role)+');'}):route.abort());
 await page.goto(base);await page.waitForFunction(()=>document.getElementById('auth-wall').hidden);
 // The live bridge must restore announcements even if legacy Home markup omits its slot.
 await page.evaluate(()=>{for(const name of ['home','playerHome']){const original=window[name];window[name]=()=>{const wrapper=document.createElement('div');wrapper.innerHTML=original();wrapper.querySelectorAll('.sideline-feature').forEach(e=>e.remove());return wrapper.innerHTML}}changeTab('home')});
 await page.locator('#sideline-all').waitFor();assert.equal(await page.locator('.sideline-feature').count(),1);assert.equal(await page.locator('#acc-sideline').count(),1);
 for(const tab of ['home','team','matches','stats','training',...(role==='coach'?['sessions','playerprograms','profile']:[])]){
 await page.evaluate(t=>{if(t==='profile')selectedProfile='p1';changeTab(t)},tab);await page.waitForTimeout(60);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${role}/${width}/${tab}: overflow`);
 assert.equal(await page.locator('main input:not([type=hidden]),main select,main textarea').evaluateAll(fields=>fields.filter(f=>!f.labels?.length&&!f.hasAttribute('aria-label')).length),0,`${tab}: labels`);
 if(tab!=='home')assert(await page.locator('header').evaluate(e=>e.getBoundingClientRect().height)<140);
 assert.deepEqual(await page.locator('#tabs button').allTextContents(),['Home','Team','Matches','Stats',role==='coach'?'Training':'My Training']);assert.match(await page.locator('#acc-btn').innerText(),role==='coach'?/COACH/:/PLAYER/);
 assert.equal(await page.getByRole('button',{name:/team standards/i}).count(),0);
 if(role==='coach'&&tab==='team'){assert.deepEqual(await page.locator('.inner-tabs button').allTextContents(),['SQUAD','TEAM SELECTION']);await page.getByRole('heading',{name:'First Grade squad'}).waitFor();await page.getByRole('button',{name:'TEAM SELECTION',exact:true}).click();await page.locator('#sel-fixture').waitFor();assert.equal(await page.getByRole('heading',{name:'Progress tracker'}).count(),0);await page.getByRole('button',{name:'SQUAD',exact:true}).click();await page.locator('#player-name').waitFor()}
 if(tab==='matches'){await page.getByRole('heading',{name:/match centre/i}).waitFor();assert.equal(await page.getByRole('heading',{name:'Progress tracker'}).count(),0)}
 if(tab==='stats')await page.getByRole('heading',{name:'PLAYER STATISTICS',exact:true}).waitFor();
 if(tab==='training')assert.equal(await page.getByRole('heading',{name:'Progress tracker'}).count(),0);
 screens++;
 }
 page.once('dialog',d=>d.accept());
 await page.evaluate(()=>importData({files:[new File([JSON.stringify(state)],'backup.json',{type:'application/json'})]}));
 await page.waitForTimeout(80);assert.deepEqual(await page.locator('#tabs button').allTextContents(),['Home','Team','Matches','Stats',role==='coach'?'Training':'My Training']);
 await page.evaluate(()=>changeTab('home'));await page.locator('#sideline-all').click();await page.locator('[data-delete-post="post1"]').waitFor();assert.equal(await page.locator('[data-delete-post="post2"]').count(),role==='coach'?1:0);
 await page.locator('[data-delete-post="post1"]').click();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('[data-delete-post="post1"]').count(),1);
 await page.locator('[data-delete-post="post1"]').click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[data-delete-post="post1"]'));assert.equal(await page.getByText('Another member announcement',{exact:true}).count(),1);
 await page.evaluate(()=>changeTab('home'));await page.locator('#acc-btn').click();await page.keyboard.press('Escape');await page.waitForFunction(()=>document.getElementById('acc-panel').hidden);
 if(role==='player'){
 await page.evaluate(()=>changeTab('training'));await page.getByText('Completed strength training',{exact:true}).waitFor();
 await page.locator('#log-details').fill('New workout');await page.locator('#log-save').dblclick();await page.getByText('New workout',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>testWrites.filter(w=>w.table==='player_training').length),1);
 await page.locator('[data-log-edit="new-log"]').click();await page.locator('#dialog-details').fill('Updated workout');await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByText('Updated workout',{exact:true}).waitFor();
 await page.locator('[data-log-delete="new-log"]').click();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('[data-log-delete="new-log"]').count(),1);
 await page.locator('[data-log-delete="new-log"]').click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[data-log-delete="new-log"]'));
 await page.evaluate(()=>window.testFail=true);await page.locator('#log-details').fill('Keep this draft');await page.locator('#log-save').click();await page.waitForFunction(()=>document.getElementById('app-feedback').dataset.error==='true');assert.equal(await page.locator('#log-details').inputValue(),'Keep this draft');assert.equal(await page.locator('#log-save').isEnabled(),true);
 }else{
 await page.locator('#acc-btn').click();await page.locator('#acc-invite').click();await page.locator('#dialog-email').fill('new@example.invalid');await page.locator('#dialog-player').selectOption('p1');await page.getByRole('button',{name:'Send invitation',exact:true}).click();await page.waitForFunction(()=>window.invitation);assert.equal(await page.evaluate(()=>invitation.redirectTo),base+'/');
 await page.evaluate(()=>changeTab('access'));await page.locator('#access-name').fill('New Player');await page.locator('#access-email').fill('new@example.invalid');await page.locator('#access-player').selectOption('p1');await page.locator('#access-issue').click();await page.locator('#activation-result').waitFor();assert.match(await page.locator('#activation-result').inputValue(),/^ABCD-/);assert.equal(await page.evaluate(()=>accessCall.action),'list');
 await page.evaluate(()=>teamSection('selection'));await page.waitForTimeout(80);assert.equal(await page.locator('[data-slot="0"]').inputValue(),'p1');
 await page.evaluate(()=>teamSection('availability'));assert.equal(await page.locator('select[onchange*="setAvailability"]').count(),0);
 await page.evaluate(()=>teamSection('squad'));await page.getByRole('button',{name:'Archive',exact:true}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.getByText('Alex A Very Long Player Name',{exact:true}).count(),1);
 await page.getByRole('button',{name:'Archive',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[onclick*=playerRemove]'));assert.equal(await page.evaluate(()=>testWrites.filter(w=>w.table==='squad_players'&&w.method==='delete').length),0);assert.equal(await page.evaluate(()=>testWrites.some(w=>w.table==='squad_players'&&w.method==='update'&&w.payload.active===false)),true);

 }
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('rlhq-v1')).club.players),undefined);
 await page.locator('#acc-btn').click();await page.locator('#acc-out').click();await page.waitForFunction(()=>!document.getElementById('auth-wall').hidden);assert.equal(await page.evaluate(()=>club.players.length),0);
 await page.locator('#activate-toggle').click();await page.locator('#activation-email').fill('new@example.invalid');await page.locator('#activation-code').fill('ABCD-EF01-2345-6789-ABCD-EF01-2345-6789');await page.locator('#activation-password').fill('a secure password');await page.locator('#activation-repeat').fill('a secure password');await page.locator('#activation-form button').click();await page.waitForFunction(()=>document.getElementById('activation-form').hidden);assert.equal(await page.locator('#comets-email').inputValue(),'new@example.invalid');assert.equal(await page.locator('#activation-password').inputValue(),'');
 assert.deepEqual(errors,[]);await page.close();
 }
 const offlineContext=await browser.newContext();const offlinePage=await offlineContext.newPage();
 await offlinePage.route('https://**/*',r=>r.abort());await offlinePage.goto(base);
 await offlinePage.waitForFunction(async()=>{await navigator.serviceWorker.ready;return !!navigator.serviceWorker.controller});
 await offlinePage.waitForFunction(async()=>{const keys=await caches.keys();return keys.length>0});
 await offlineContext.setOffline(true);
 const cached=await offlinePage.evaluate(async()=>{const icon=await fetch('./apple-touch-icon.png?v=703');const css=await fetch('./polish.css?v=703');return {icon:icon.status,css:css.status,type:icon.headers.get('content-type')}});
 assert.equal(cached.icon,200);assert.equal(cached.css,200);assert.equal(cached.type,'image/png');
 const manifest=await offlinePage.evaluate(async()=>await (await fetch('./manifest.webmanifest')).json());assert.equal(manifest.icons[0].src,'./apple-touch-icon.png?v=703');
 await offlineContext.close();
 console.log(`PASS: ${screens} populated responsive screens, labels, compact headers, save deduplication, log history/editing/deletion, error recovery, invitation redirect, selection restoration sign-out cleanup, offline shell assets and home-screen icon.`);
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
