import {auth,onAuthStateChanged,signOut,signInAnonymously,profileFor,ref,set,onValue,onDisconnect,rtdbTimestamp,rtdb} from './firebase.js';
let authResolved=false,activeSessionRef=null;
export const ready=new Promise(resolve=>{
  const stop=onAuthStateChanged(auth,async user=>{
    if(!user&&!authResolved){authResolved=true;try{await signInAnonymously(auth);return}catch(e){console.warn('Anonymous presence unavailable. Enable Anonymous Authentication in Firebase.',e)}}
    authResolved=true;window.hstUser=user||null;let profile=null;
    if(user&&!user.isAnonymous){try{profile=await profileFor(user.uid)}catch(e){console.warn(e)}}
    window.hstProfile=profile;paint(user,profile);if(user)setupPresence(user,profile);resolve({user,profile});
  });
});
function paint(user,profile){
  const signed=user&&!user.isAnonymous;
  document.querySelectorAll('[data-auth-area]').forEach(el=>{el.innerHTML=signed?`<a href="profile.html" class="account-pill">${escapeHtml(profile?.displayName||user.displayName||'Finish profile')}</a><button class="nav-signout" data-signout>Sign out</button>`:`<a href="login.html" class="account-pill">Sign in</a>`});
  document.querySelectorAll('[data-signout]').forEach(b=>b.onclick=async()=>{await signOut(auth);location.href='index.html'});
}
function setupPresence(user,profile){
  const sessionId=getSessionId(),session=ref(rtdb,`activeSessions/${user.uid}/${sessionId}`),connected=ref(rtdb,'.info/connected');activeSessionRef=session;
  onValue(connected,async snap=>{if(!snap.val())return;const data={state:'online',signedIn:!user.isAnonymous,displayName:user.isAnonymous?'Guest':(profile?.displayName||user.displayName||'Player'),lastChanged:rtdbTimestamp()};await onDisconnect(session).remove();await set(session,data)});
  onValue(ref(rtdb,'activeSessions'),snap=>{let count=0;snap.forEach(userSnap=>{if(userSnap.exists())count++});document.querySelectorAll('[data-online-count]').forEach(el=>el.textContent=String(count));document.querySelectorAll('[data-online-label]').forEach(el=>el.textContent=count===1?'player online':'players online')});
}
function getSessionId(){let id=sessionStorage.getItem('hst_session_id');if(!id){id=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;sessionStorage.setItem('hst_session_id',id)}return id.replace(/[.#$\[\]/]/g,'_')}
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
