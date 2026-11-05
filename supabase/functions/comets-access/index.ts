import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

// Public redemption is intentional. Every coach action verifies the access token
// with Supabase Auth and looks up the role server-side. Never trust a submitted role.
const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json'}});
const hash=async(code:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const checked=async(q:PromiseLike<any>)=>{const {data,error}=await q;if(error)throw new Error('The access service could not complete this request.');return data};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 try{
 if(Number(req.headers.get('content-length'))>8192)return reply({error:'Request too large.'},413);
 const raw=await req.text();if(raw.length>8192)return reply({error:'Request too large.'},413);
 const body=JSON.parse(raw),action=body.action;
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 if(action==='redeem'){
  const code=String(body.code||'').replace(/[\s-]/g,'').toUpperCase(),email=String(body.email||'').trim().toLowerCase(),password=body.password;
  if(!/^[A-F0-9]{32}$/.test(code)||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<12||password.length>128)return reply({error:'Enter your code, invited email and a password of 12–128 characters.'},400);
  const claim=crypto.randomUUID();
  const rows=await checked(db.rpc('comets_claim_activation',{p_hash:await hash(code),p_email:email,p_claim:claim}));
  if(rows.length!==1)return reply({error:'Code or email is incorrect, expired, or already used. Ask your coach for a new code.'},400);
  const activation=rows[0];let createdId:string|undefined,completed=false;
  try{
   // Create a temporarily banned account so no session can be opened before
   // its server-assigned role and player link have been committed.
   const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true,ban_duration:'1h',user_metadata:{display_name:activation.display_name}});
   if(error||!data.user)throw new Error('Account could not be created. If you already have an account, use your existing sign-in. Otherwise ask your coach for help.');
   createdId=data.user.id;
   await checked(db.rpc('comets_complete_activation',{p_id:activation.id,p_claim:claim,p_user:createdId}));completed=true;
   const {error:unbanError}=await db.auth.admin.updateUserById(createdId,{ban_duration:'none'});
   if(unbanError)return reply({error:'Your account was created but could not be enabled. Ask your coach to contact the project administrator.'},503);
   return reply({ok:true});
  }catch(e){
   let reusable=!createdId;
   if(createdId&&!completed){const {error}=await db.auth.admin.deleteUser(createdId);reusable=!error;}
   if(reusable)await checked(db.from('comets_activation_codes').update({status:'pending',claim_id:null}).eq('id',activation.id).eq('claim_id',claim).eq('status','claimed'));
   return reply({error:e instanceof Error?e.message:'Activation failed. Please contact your coach.'},400);
  }
 }
 const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)return reply({error:'Sign in as a coach.'},401);
 const {data:auth,error}=await db.auth.getUser(token);if(error||!auth.user)return reply({error:'Please sign in again.'},401);
 const roles=await checked(db.from('user_roles').select('role').eq('user_id',auth.user.id));
 if(!roles.some((r:any)=>r.role==='coach'))return reply({error:'Coach access is required.'},403);
 if(action==='list'){
  const codes=await checked(db.from('comets_activation_codes').select('id,email,display_name,role,player_id,created_at,expires_at,status').order('created_at',{ascending:false}).limit(100));
  return reply({codes});
 }
 if(action==='revoke'){
  const rows=await checked(db.from('comets_activation_codes').update({status:'revoked'}).eq('id',body.id).eq('status','pending').select('id'));
  if(!rows.length)return reply({error:'This code is no longer pending. Refresh the list.'},409);
  return reply({ok:true});
 }
 if(action==='issue'){
  const email=String(body.email||'').trim().toLowerCase(),name=String(body.name||'').trim(),role=body.role,player=body.player_id||null;
  if(!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!name||name.length>100||!['coach','player'].includes(role)||(role==='player'&&!player))return reply({error:'Enter a name, email, role and a linked player for player accounts.'},400);
  if(player){
   const players=await checked(db.from('squad_players').select('id').eq('id',player).eq('active',true));
   const links=await checked(db.from('player_links').select('user_id').eq('player_id',player));
   if(players.length!==1||links.length)return reply({error:'Choose an active player who does not already have an account.'},400);
  }
  // 128 bits of randomness; only its SHA-256 hash is retained in the database.
  const code=Array.from(crypto.getRandomValues(new Uint8Array(16))).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
  const codes=await checked(db.from('comets_activation_codes').insert({code_hash:await hash(code),email,display_name:name,role,player_id:player,created_by:auth.user.id}).select('id,expires_at'));
  return reply({code:code.match(/.{4}/g)!.join('-'),expires_at:codes[0].expires_at});
 }
 return reply({error:'Unknown action.'},400);
 }catch{return reply({error:'Access service unavailable. Check that the database setup is installed, then retry.'},500)}
});
