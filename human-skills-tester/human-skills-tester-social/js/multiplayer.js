import {auth,rtdb,ref,set,update,remove,get,onValue,onDisconnect,rtdbTimestamp,runRTDBTransaction,profileFor,onAuthStateChanged} from './firebase.js';

const $=s=>document.querySelector(s);
const message=(text,type='info')=>{const el=$('#multiMessage');el.textContent=text;el.dataset.type=type};
let user=null,profile=null,roomId=null,roomUnsub=null,connectionUnsub=null,startLock=false,serverOffset=0;

function waitForAuth(){return new Promise(resolve=>{if(auth.currentUser)return resolve(auth.currentUser);const stop=onAuthStateChanged(auth,u=>{stop();resolve(u)})})}
function roomCode(){return Math.random().toString(36).slice(2,8).toUpperCase()}
function saveDestination(url=location.href){sessionStorage.setItem('hst_after_auth',url)}
async function requirePlayer(){
  user=await waitForAuth();
  if(!user||user.isAnonymous){saveDestination(location.href);location.href=`login.html?next=${encodeURIComponent(location.pathname.split('/').pop()+location.search)}`;return false}
  profile=await profileFor(user.uid);
  if(!profile){saveDestination(location.href);location.href='setup-profile.html';return false}
  return true;
}
function playerData(){return {name:profile.displayName,ready:false,finished:false,score:0,connected:true,joinedAt:rtdbTimestamp(),lastSeen:rtdbTimestamp()}}
async function createRoom(type='reaction',isPublic=false){
  if(!await requirePlayer())return;
  message('Creating room…');
  for(let attempt=0;attempt<4;attempt++){
    const id=roomCode();
    const result=await runRTDBTransaction(ref(rtdb,`rooms/${id}`),current=>current?undefined:{id,type,public:isPublic,status:'waiting',host:user.uid,createdAt:Date.now()+serverOffset,players:{[user.uid]:playerData()}});
    if(result.committed){roomId=id;localStorage.setItem('hst_active_room',id);if(isPublic)await set(ref(rtdb,`openRooms/${id}`),{type,createdAt:rtdbTimestamp()});watchRoom(id);return}
  }
  throw new Error('Could not reserve a room code. Try again.');
}

async function joinRoom(rawId) {
  if (!await requirePlayer()) {
    return;
  }

  const id = String(rawId || "")
    .trim()
    .toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(id)) {
    throw new Error(
      "Enter a valid six-character room code."
    );
  }

  message("Joining room…");

  const roomRef = ref(rtdb, `rooms/${id}`);
  const roomSnapshot = await get(roomRef);

  if (!roomSnapshot.exists()) {
    throw new Error("Room not found or expired.");
  }

  const room = roomSnapshot.val();

  if (room.status !== "waiting") {
    throw new Error(
      "This match has already started."
    );
  }

  const playerRef = ref(
    rtdb,
    `rooms/${id}/players/${user.uid}`
  );

  const oldPlayer = room.players?.[user.uid];

  await set(playerRef, {
    name: profile.displayName,
    ready: oldPlayer?.ready ?? false,
    finished: false,
    score: 0,
    connected: true,
    joinedAt:
      oldPlayer?.joinedAt ??
      rtdbTimestamp(),
    lastSeen: rtdbTimestamp()
  });

  const verificationSnapshot =
    await get(roomRef);

  if (!verificationSnapshot.exists()) {
    throw new Error(
      "The room closed while you were joining."
    );
  }

  const verifiedRoom =
    verificationSnapshot.val();

  if (!verifiedRoom.players?.[user.uid]) {
    throw new Error(
      "Your player slot could not be created."
    );
  }

  if (
    verifiedRoom.status !== "waiting" &&
    verifiedRoom.status !== "countdown"
  ) {
    throw new Error(
      "The match started before you finished joining."
    );
  }

  roomId = id;

  localStorage.setItem(
    "hst_active_room",
    id
  );

  await remove(
    ref(rtdb, `openRooms/${id}`)
  ).catch(() => {});

  await watchRoom(id);
}

async function attachConnection(id){
  const playerRef=ref(rtdb,`rooms/${id}/players/${user.uid}`);
  await onDisconnect(playerRef).update({connected:false,lastSeen:rtdbTimestamp()});
  await update(playerRef,{connected:true,lastSeen:rtdbTimestamp()});
  if(connectionUnsub)connectionUnsub();
  connectionUnsub=onValue(ref(rtdb,'.info/connected'),snap=>{
    const badge=$('#connectionStatus');
    if(badge){badge.textContent=snap.val()?'Connected':'Reconnecting…';badge.className=`connection-badge ${snap.val()?'online':'offline'}`}
  });
}
async function watchRoom(id){
  history.replaceState(null,'',`?room=${id}`);$('#lobby').hidden=true;$('#room').hidden=false;$('#roomCode').textContent=id;message('Waiting for both players.');
  await attachConnection(id);
  if(roomUnsub)roomUnsub();
  roomUnsub=onValue(ref(rtdb,`rooms/${id}`),snap=>{
    if(!snap.exists()){message('This room was closed.','error');showLobby();return}
    renderRoom(snap.val()).catch(e=>message(e.message,'error'));
  },e=>message(`Room connection failed: ${e.message}`,'error'));
}
async function renderRoom(room){
  const players=Object.entries(room.players||{});
  $('#players').innerHTML=players.map(([uid,p])=>`<div class="player-row"><span class="player-identity"><i class="presence-dot ${p.connected?'online':'offline'}"></i>${escapeHtml(p.name)}${uid===user.uid?' <small>(you)</small>':''}</span><strong>${p.ready?'Ready':'Not ready'}</strong></div>`).join('');
  $('#ready').disabled=players.length<2||room.status!=='waiting';
  $('#ready').textContent=room.players?.[user.uid]?.ready?'Ready ✓':'Ready';
  if(room.status==='waiting'&&room.host===user.uid&&players.length>=2&&players.every(([,p])=>p.ready)&&!startLock){
    startLock=true;
    const startAt=Date.now()+serverOffset+4000;
    const tx=await runRTDBTransaction(ref(rtdb,`rooms/${room.id}`),current=>{
      if(!current||current.status!=='waiting')return;
      const ps=Object.values(current.players||{});if(ps.length<2||!ps.every(p=>p.ready))return;
      current.status='countdown';current.seed=Math.floor(Math.random()*1e9);current.startAt=startAt;return current;
    });
    if(!tx.committed)startLock=false;
  }
  if(room.status==='countdown'||room.status==='playing'){
    localStorage.setItem('hst_active_room',room.id);
    location.replace(`battle.html?room=${room.id}`);
  }
}
function showLobby(){roomId=null;localStorage.removeItem('hst_active_room');$('#room').hidden=true;$('#lobby').hidden=false}
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

$('#createPrivate').onclick=()=>createRoom($('#gameType').value,false).catch(e=>message(e.message,'error'));
$('#createPublic').onclick=()=>createRoom($('#gameType').value,true).catch(e=>message(e.message,'error'));
$('#joinForm').onsubmit=e=>{e.preventDefault();joinRoom($('#joinCode').value).catch(err=>message(err.message,'error'))};
$('#ready').onclick=async()=>{try{const current=(await get(ref(rtdb,`rooms/${roomId}/players/${user.uid}/ready`))).val();await set(ref(rtdb,`rooms/${roomId}/players/${user.uid}/ready`),!current)}catch(e){message(`Could not update ready status: ${e.message}`,'error')}};
$('#leave').onclick=async()=>{try{await remove(ref(rtdb,`rooms/${roomId}/players/${user.uid}`));if(user.uid===(await get(ref(rtdb,`rooms/${roomId}/host`))).val())await remove(ref(rtdb,`rooms/${roomId}`));}finally{location.href='multiplayer.html'}};
$('#matchmake').onclick=async()=>{try{if(!await requirePlayer())return;message('Looking for an opponent…');const wanted=$('#gameType').value,open=(await get(ref(rtdb,'openRooms'))).val()||{};for(const [id,data] of Object.entries(open)){if(data.type===wanted){try{return await joinRoom(id)}catch{await remove(ref(rtdb,`openRooms/${id}`)).catch(()=>{})}}}await createRoom(wanted,true)}catch(e){message(e.message,'error')}};

(async()=>{
  onValue(ref(rtdb,'.info/serverTimeOffset'),s=>{serverOffset=Number(s.val())||0});
  if(!await requirePlayer())return;
  const id=new URLSearchParams(location.search).get('room');
  if(id)await joinRoom(id).catch(e=>message(e.message,'error'));
})();
