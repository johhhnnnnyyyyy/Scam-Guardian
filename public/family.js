import {familyState} from './family-state.js';
const $=id=>document.getElementById(id);
// The link from the senior's device carries a one-time invite in the URL hash. It links an account; it is not a login.
const inviteToken=/^[a-f0-9]{64}$/.test(location.hash.slice(1))?location.hash.slice(1):null;
let stopped=false,timer;

async function familyApi(path,method='GET',body,headers={}){
 const r=await fetch(path,{method,credentials:'same-origin',headers:{...headers,...(body&&!(body instanceof Blob)?{'Content-Type':'application/json'}:{})},body:body instanceof Blob?body:body?JSON.stringify(body):undefined});
 if(!r.ok){const d=await r.json().catch(()=>({}));const e=Error(d.error||'Request failed.');e.status=r.status;throw e;}
 return r;
}
function showTimeline(items){$('timeline').replaceChildren(...(items?.length?items.map(event=>Object.assign(document.createElement('li'),{textContent:`${new Date(event.at).toLocaleString()} · ${event.risk==='danger'?'Hang up now':'Be careful'} · ${event.reasons.join(', ')}`})):[Object.assign(document.createElement('li'),{textContent:'No warnings yet.'})]));}
function status(id,message){$(id).textContent=message;}
function b64ToBytes(value){const padded=value.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(padded),c=>c.charCodeAt(0));}

function showAuth(message=''){
 stopped=true;clearTimeout(timer);
 $('family-content').hidden=true;$('auth-section').hidden=false;$('invite-note').hidden=!inviteToken;
 $('register').hidden=!inviteToken;
 status('auth-status',message||(inviteToken?'':'Sign in with your family account. To create one, open the private link from your family member’s device.'));
}
function showFamily(username){
 $('auth-section').hidden=true;$('family-content').hidden=false;status('signed-in',`Signed in as ${username}.`);
 if(inviteToken)history.replaceState(null,'','/family');
 stopped=false;poll();
}

async function poll(){
 if(stopped)return;
 try{
  const d=await(await familyApi('/api/family')).json();
  showTimeline(d.timeline);
  status('codeword-status',d.codeWordConfigured?'Code word confirmed. The word itself is not stored.':'Not configured.');
  status('push-status',d.pushStatus);
  if(!d.sharing){$('risk-panel').dataset.risk='idle';$('risk-title').textContent='Not sharing right now';$('risk-message').textContent='Your family member is not sharing a session. No live safety assessment is available.';$('reasons').replaceChildren();$('status').textContent='';}
  else{
   const view=familyState(d);$('risk-panel').dataset.risk=view.risk;$('risk-title').textContent=view.title;$('risk-message').textContent=view.message;
   $('reasons').replaceChildren(...d.reasons.map(text=>Object.assign(document.createElement('li'),{textContent:text})));
   $('status').textContent=`${d.mode==='demo'||d.mode==='text'?'Synthetic demonstration. ':''}Last speech: ${new Date(d.updatedAt).toLocaleTimeString()}. ${d.status==='stopped'?'Listening has stopped.':''}`;
  }
 }catch(e){
  if(e.status===401){showAuth('Your sign-in expired. Please sign in again.');return;}
  $('risk-panel').dataset.risk='error';$('risk-title').textContent='Updates unavailable';$('risk-message').textContent=e.message;$('reasons').replaceChildren();$('status').textContent='Previous warning is no longer live.';
  if(e.status===403){stopped=true;return;}
 }
 if(!stopped)timer=setTimeout(poll,2000);
}

async function authenticate(path){
 try{
  const username=$('username').value.trim(),passphrase=$('passphrase').value;
  if(!username||!passphrase)throw Error('Enter your username and passphrase.');
  const d=await(await familyApi(path,'POST',{username,passphrase,...(inviteToken?{invite:inviteToken}:{})})).json();
  $('passphrase').value='';
  if(!d.linked){showAuth('Signed in, but not linked to anyone yet. Open the private link from your family member’s device.');return;}
  showFamily(d.username);
 }catch(e){status('auth-status',e.message);}
}
$('login').onclick=()=>authenticate('/api/guardians/login');
$('register').onclick=()=>authenticate('/api/guardians/register');
$('logout').onclick=async()=>{try{await familyApi('/api/guardians/logout','POST');}catch{}showAuth('Signed out.');};

(async()=>{
 try{
  const me=await(await familyApi('/api/guardians/me')).json();
  if(inviteToken){showAuth(`Signed in as ${me.username}. Sign in again to link this invite to your account.`);$('username').value=me.username;return;}
  if(!me.linked){showAuth('Your account is not linked to anyone. Open the private link from your family member’s device.');return;}
  showFamily(me.username);
 }catch{showAuth();}
})();
window.addEventListener('pagehide',()=>{stopped=true;clearTimeout(timer);});
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
$('enable-push').onclick=async()=>{try{const {publicKey}=await(await fetch('/api/push-key')).json();if(!publicKey)throw Error('Server push is not configured.');if(!('serviceWorker' in navigator)||!('PushManager' in window))throw Error('This browser does not support background push.');const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Notifications were not allowed on this device.');const registration=await navigator.serviceWorker.ready;const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(publicKey)});await familyApi('/api/family/push','POST',{subscription});status('push-status','Subscribed. Delivery requires a reachable secure deployment and browser push service.');}catch(e){status('push-status',e.message);}};
$('disable-push').onclick=async()=>{try{await familyApi('/api/family/push','DELETE');const registration=await navigator.serviceWorker.ready;await(await registration.pushManager.getSubscription())?.unsubscribe();status('push-status','Push disabled.');}catch(e){status('push-status',e.message);}};
$('codeword').onclick=async()=>{try{await familyApi('/api/family/codeword','POST',{confirmedOffline:true,word:$('codeword-input').value});$('codeword-input').value='';status('codeword-status','Code word confirmed. The word itself is not stored.');}catch(e){status('codeword-status',e.message);}};
$('create-setup').onclick=async()=>{try{const d=await(await familyApi('/api/family/setup','POST',{language:$('setup-language').value})).json();$('setup-link').value=d.link;$('setup-qr').src=d.qr;$('setup-result').hidden=false;}catch(e){status('status',e.message);}};
$('enroll-voice').onclick=async()=>{try{if(!$('voice-consent').checked)throw Error('Read and check the voice consent first.');const file=$('voice-file').files[0];if(!file)throw Error('Choose your own WAV voice sample.');const r=await familyApi('/api/family/voice','POST',file,{'Content-Type':file.type||'audio/wav','X-Voice-Consent':'true'});await r.json();status('voice-status','Voice enrolled for this temporary session. The senior must separately opt in.');}catch(e){status('voice-status',e.message);}};
$('revoke-voice').onclick=async()=>{try{await familyApi('/api/family/voice','DELETE');status('voice-status','Voice revoked.');}catch(e){status('voice-status',e.message);}};
$('approve-setup').onclick=async()=>{try{await familyApi('/api/family/setup/approve','POST',{code:$('setup-code').value.trim()});$('setup-code').value='';status('setup-status','Approved. Their device will finish setup by itself.');}catch(e){status('setup-status',e.message);}};
