// Executes the Edge Function with mocked Auth/database services; no production calls.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/comets-access/index.ts','utf8').replace(/^import .*;\n/,''));
let handler,role='coach',writes=[],failComplete=false,deleted=false,claimAvailable=true;
const code='ABCDEF0123456789ABCDEF0123456789';
const db={auth:{getUser:async token=>token==='valid'?{data:{user:{id:'coach'}}}:{data:{},error:{}},admin:{createUser:async opts=>{assert.equal(opts.ban_duration,'1h');return {data:{user:{id:'new-user'}}}},updateUserById:async()=>({}),deleteUser:async()=>{deleted=true;return {}}}},rpc:async(name,args)=>{writes.push({name,args});if(name==='comets_claim_activation')return {data:claimAvailable?[{id:'activation',display_name:'Alex'}]:[]};return failComplete?{error:{}}:{data:null}},from:table=>{let method='select',body;const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,insert:b=>{body=b;method='insert';return q},update:b=>{body=b;method='update';return q},then:r=>{writes.push({table,method,body});return Promise.resolve({data:table==='user_roles'?[{role}]:table==='squad_players'?[{id:'player'}]:table==='player_links'?[]:method==='insert'?[{id:'code-id',expires_at:'2027-01-01'}]:[]}).then(r)}};return q}};
vm.runInNewContext(source,{createClient:()=>db,Deno:{env:{get:()=>''},serve:f=>handler=f},Response,Request,crypto,TextEncoder,Uint8Array,JSON,Error,Number,String,Array});
const call=async(body,token)=>{const response=await handler(new Request('https://local/access',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()}};
(async()=>{
 assert.equal((await call({action:'list'})).status,401);
 role='player';assert.equal((await call({action:'issue'},'valid')).status,403);role='coach';
 const result=await call({action:'issue',name:'Alex',email:'Alex@example.invalid',role:'player',player_id:'player'},'valid');assert.equal(result.status,200);assert.match(result.body.code,/^[A-F0-9]{4}(-[A-F0-9]{4}){7}$/);
 const insert=writes.find(w=>w.method==='insert').body;assert.equal(insert.code_hash.length,64);assert.equal(insert.code,undefined);assert.equal(insert.email,'alex@example.invalid');assert.equal(insert.created_by,'coach');
 const staff=await call({action:'issue',name:'Assistant Coach',email:'coach@example.invalid',role:'coach'},'valid');assert.equal(staff.status,200);assert.equal(writes.filter(w=>w.method==='insert').at(-1).body.player_id,null);
 assert.equal((await call({action:'redeem',code:'1234',email:'a@b.test',password:'long enough password'})).status,400);
 const activation={action:'redeem',code,email:'alex@example.invalid',password:'long enough password',role:'coach'};
 claimAvailable=false;assert.equal((await call(activation)).status,400);claimAvailable=true;
 failComplete=true;assert.equal((await call(activation)).status,400);assert.equal(deleted,true);assert(writes.some(w=>w.method==='update'&&w.body.status==='pending'));
 failComplete=false;assert.equal((await call(activation)).status,200);
 console.log('PASS: unauthenticated/player admin denial, random hashed codes, email binding, invalid/used-code rejection, activation completion and failed-provisioning cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1});
