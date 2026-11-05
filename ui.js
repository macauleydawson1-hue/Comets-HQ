/* Reusable UI helpers; no authentication or data access lives here. */
(()=>{'use strict';
const feedback=document.createElement('div');feedback.id='app-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');document.body.append(feedback);
let timer;
function notify(message,error=false){clearTimeout(timer);feedback.dataset.error=String(error);feedback.textContent=message;timer=setTimeout(()=>feedback.textContent='',error?12000:6000)}
function dialog({title,fields=[],message='',submit='Save',danger=false}){
 return new Promise(resolve=>{
 const previous=document.activeElement,el=document.createElement('dialog');el.className='app-dialog';const form=document.createElement('form');form.method='dialog';
 const heading=document.createElement('h2');heading.id='dialog-title';heading.textContent=title;el.setAttribute('aria-labelledby',heading.id);form.append(heading);
 if(message){const p=document.createElement('p');p.textContent=message;form.append(p)}
 const controls={};for(const f of fields){const label=document.createElement('label');label.textContent=f.label;const input=document.createElement(f.options?'select':f.multiline?'textarea':'input');input.name=f.name;input.id='dialog-'+f.name;label.htmlFor=input.id;
 if(f.options)for(const [value,text] of f.options){const option=document.createElement('option');option.value=value;option.textContent=text;input.append(option)}else if(!f.multiline)input.type=f.type||'text';
 input.required=f.required!==false;if(!f.options||f.value!==undefined)input.value=f.value||'';if(!f.options)input.maxLength=f.maxLength||200;if(f.minLength)input.minLength=f.minLength;controls[f.name]=input;form.append(label,input)}
 const tools=document.createElement('div');tools.className='tools';const cancel=document.createElement('button');cancel.type='button';cancel.className='secondary';cancel.textContent='Cancel';const save=document.createElement('button');save.type='submit';save.className='primary';save.textContent=submit;tools.append(cancel,save);form.append(tools);el.append(form);document.body.append(el);
 let result=null;cancel.onclick=()=>el.close();form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;result=Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,v.type==='password'?v.value:v.value.trim()]));el.close()};el.addEventListener('close',()=>{el.remove();if(previous?.isConnected)previous.focus();resolve(result)},{once:true});el.showModal();(danger?cancel:Object.values(controls)[0]||save).focus();
 });
}
let lastTab=null;
function polish(){
 document.body.classList.toggle('compact-header',typeof state!=='undefined'&&state.tab!=='home');
 document.querySelector('#tabs')?.setAttribute('aria-label','Main navigation');
 document.querySelectorAll('#tabs button').forEach(b=>{if(b.classList.contains('active'))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 document.querySelectorAll('.inner-tabs button,.stats-view-switch button').forEach(b=>b.setAttribute('aria-pressed',String(b.classList.contains('active'))));
 for(const label of document.querySelectorAll('label:not([for])')){if(label.querySelector('input,select,textarea'))continue;const next=label.nextElementSibling;if(next?.matches('input,select,textarea')&&next.id)label.htmlFor=next.id}
 const names={'prog-player':'Player','prog-title':'Program title','prog-details':'Exercises and instructions','log-type':'Log type','log-details':'What did you complete?','stat-fixture':'Fixture','stat-player':'Player','feed-text':'Team update','readiness':'How are you feeling?'};
 for(const control of document.querySelectorAll('main input:not([type=hidden]),main select,main textarea')){
 if(control.labels?.length||control.hasAttribute('aria-label'))continue;
 const text=names[control.id]||control.placeholder||control.closest('.club-row')?.querySelector('b')?.textContent;
 if(text){const label=document.createElement('label');control.id||=(control.dataset.reply?'reply-'+control.dataset.reply:'field-'+Math.random().toString(36).slice(2));label.htmlFor=control.id;label.textContent=text;control.before(label)}
 }
 for(const node of document.querySelectorAll('main .club-small,main .club-row small,main .feature-card p,main .player-tile p')){
 for(const text of [...node.childNodes].filter(n=>n.nodeType===3))text.textContent=text.textContent.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,(s)=>{const d=new Date(s+'T12:00:00');return Number.isNaN(+d)?s:d.toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'})});
 }
 if(typeof state!=='undefined'&&lastTab!==state.tab){lastTab=state.tab;const main=document.getElementById('app');main.tabIndex=-1;if(document.getElementById('auth-wall').hidden)main.focus({preventScroll:true})}
}
const network=document.createElement('div');network.className='network-status';network.setAttribute('role','status');document.querySelector('header').after(network);function connectivity(){network.hidden=navigator.onLine;network.textContent='You’re offline. Reconnect to load club data and save changes.'}addEventListener('online',connectivity);addEventListener('offline',connectivity);connectivity();
const observer=new MutationObserver(()=>{observer.disconnect();polish();observer.observe(document.getElementById('app'),{childList:true,subtree:true})});observer.observe(document.getElementById('app'),{childList:true,subtree:true});
function closeAccount(focus=false){const panel=document.getElementById('acc-panel');if(panel)panel.hidden=true;const button=document.getElementById('acc-btn');button?.setAttribute('aria-expanded','false');if(focus)button?.focus()}
document.addEventListener('click',e=>{if(!e.target.closest('.account-mini'))closeAccount()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAccount(true)});
window.CometsUI={notify,dialog,polish,closeAccount};polish();
})();
