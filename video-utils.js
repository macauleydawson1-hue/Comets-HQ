/* Parse video identifiers only; never embed caller-supplied HTML or URLs. */
(()=>{'use strict';
function youtubeId(value){
 try{
  const url=new URL(/^https?:\/\//i.test(value.trim())?value.trim():'https://'+value.trim());
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port)return null;
  const host=url.hostname.toLowerCase().replace(/^www\./,''),parts=url.pathname.split('/').filter(Boolean);let id=null;
  if(host==='youtu.be'&&parts.length===1)id=parts[0];
  if(['youtube.com','m.youtube.com'].includes(host)){
   if(url.pathname==='/watch')id=url.searchParams.get('v');
   else if(parts.length===2&&['shorts','live','embed'].includes(parts[0]))id=parts[1];
  }
  if(host==='youtube-nocookie.com'&&parts.length===2&&parts[0]==='embed')id=parts[1];
  return id&&/^[A-Za-z0-9_-]{11}$/.test(id)?id:null;
 }catch{return null}
}
function youtubeReferenceId(reference){return /\/youtube\/([A-Za-z0-9_-]{11})\/[0-9a-f-]{36}$/i.exec(reference||'')?.[1]||null}
const api={youtubeId,youtubeReferenceId};globalThis.CometsVideo=api;if(typeof module!=='undefined')module.exports=api;
})();
