import {auth,rtdb,ref,set,update,remove,get,onValue,onDisconnect,rtdbTimestamp,runRTDBTransaction,profileFor,onAuthStateChanged} from './firebase.js';

const $=selector=>document.querySelector(selector);
const showMessage=(text,type='info')=>{const el=$('#multiMessage');el.textContent=text;el.dataset.type=type};
let user=null,profile=null,roomId=null,roomUnsub=null,connectionUnsub=null,startLock=false,serverOffset=0;

function waitForAuth(){return new Promise(resolve=>{if(auth.currentUser)return resolve(auth.currentUser);const stop=onAuthStateChanged(auth,current=>{stop();resolve(current)})})}
function createCode(){return Math.random().toString(36).slice(2,8).toUpperCase()}
function selectedRounds(){const value=Number($('#roundCount')?.value||1);return [1,3,5,7,10].includes(value)?value:1}
async function requirePlayer(){
  user=await waitForAuth();
  if(!user||user.isAnonymous){sessionStorage.setItem('hst_after_auth',location.href);location.href=`login.html?next=${encodeURIComponent(location.pathname.split('/').pop()+location.search)}`;return false}
  profile=await profileFor(user.uid);
  if(!profile){sessionStorage.setItem('hst_after_auth',location.href);location.href='setup-profile.html';return false}
  return true;
}
function newPlayer(existing={}){return {name:profile.displayName,ready:existing.ready??false,finished:false,score:0,wins:existing.wins??0,connected:true,joinedAt:existing.joinedAt??rtdbTimestamp(),lastSeen:rtdbTimestamp()}}
async function createRoom(type='reaction',isPublic=false){
  if(!await requirePlayer())return;
  showMessage('Creating room…');
  const rounds=selectedRounds();
  for(let attempt=0;attempt<5;attempt++){
    const id=createCode();
    const room={id,type,rounds,currentRound:1,public:isPublic,status:'waiting',host:user.uid,createdAt:Date.now()+serverOffset,players:{[user.uid]:newPlayer()}};
    const result=await runRTDBTransaction(ref(rtdb,`rooms/${id}`),current=>current?undefined:room);
    if(result.committed){roomId=id;localStorage.setItem('hst_active_room',id);if(isPublic)await set(ref(rtdb,`openRooms/${id}`),{type,rounds,createdAt:rtdbTimestamp()});await watchRoom(id);return}
  }
  throw new Error('Could not reserve a room code. Please try again.');
}
async function joinRoom(rawId){
  if(!await requirePlayer())return;
  const id=String(rawId||'').trim().toUpperCase();
  if(!/^[A-Z0-9]{6}$/.test(id))throw new Error('Enter a valid six-character room code.');
  showMessage('Joining room…');
  const roomRef=ref(rtdb,`rooms/${id}`),snapshot=await get(roomRef);
  if(!snapshot.exists())throw new Error('Room not found or expired.');
  const room=snapshot.val();
  if(room.status!=='waiting')throw new Error('This match has already started.');
  await set(ref(rtdb,`rooms/${id}/players/${user.uid}`),newPlayer(room.players?.[user.uid]||{}));
  const verify=await get(roomRef);
  if(!verify.exists()||!verify.val().players?.[user.uid])throw new Error('Your player slot could not be created.');
  roomId=id;localStorage.setItem('hst_active_room',id);await remove(ref(rtdb,`openRooms/${id}`)).catch(()=>{});await watchRoom(id);
}
async function attachConnection(id){
  const playerRef=ref(rtdb,`rooms/${id}/players/${user.uid}`);
  await onDisconnect(playerRef).update({connected:false,lastSeen:rtdbTimestamp()});
  await update(playerRef,{connected:true,lastSeen:rtdbTimestamp()});
  if(connectionUnsub)connectionUnsub();
  connectionUnsub=onValue(ref(rtdb,'.info/connected'),snapshot=>{const badge=$('#connectionStatus');if(badge){badge.textContent=snapshot.val()?'Connected':'Reconnecting…';badge.className=`connection-badge ${snapshot.val()?'online':'offline'}`}});
}
async function watchRoom(id){
  history.replaceState(null,'',`?room=${id}`);$('#lobby').hidden=true;$('#room').hidden=false;$('#roomCode').textContent=id;showMessage('Waiting for everyone to be ready.');
  await attachConnection(id);
  if(roomUnsub)roomUnsub();
  roomUnsub=onValue(ref(rtdb,`rooms/${id}`),snapshot=>{if(!snapshot.exists()){showMessage('This room was closed.','error');return showLobby()}renderRoom(snapshot.val()).catch(error=>showMessage(error.message,'error'))},error=>showMessage(`Room connection failed: ${error.message}`,'error'));
}
async function renderRoom(room){
  const players=Object.entries(room.players||{}),rounds=Number(room.rounds||1);
  $('#roomFormat').textContent=`${rounds} ${rounds===1?'round':'rounds'} · ${formatGame(room.type)}`;
  $('#players').innerHTML=players.map(([uid,p])=>`<div class="player-row"><span class="player-identity"><i class="presence-dot ${p.connected?'online':'offline'}"></i>${escapeHtml(p.name)}${uid===user.uid?' <small>(you)</small>':''}</span><strong>${p.ready?'Ready':'Not ready'}</strong></div>`).join('');
  $('#ready').disabled=players.length<2||room.status!=='waiting';
  $('#ready').textContent=room.players?.[user.uid]?.ready?'Ready ✓':'Ready';
  if(room.status==='waiting'&&room.host===user.uid&&players.length>=2&&players.every(([,p])=>p.ready)&&!startLock){
    startLock=true;
    const startAt=Date.now()+serverOffset+4000;
    const transaction=await runRTDBTransaction(ref(rtdb,`rooms/${room.id}`),current=>{
      if(!current||current.status!=='waiting')return;
      const currentPlayers=Object.values(current.players||{});if(currentPlayers.length<2||!currentPlayers.every(p=>p.ready))return;
      current.status='countdown';current.currentRound=1;current.seed=Math.floor(Math.random()*1e9);current.startAt=startAt;
      for(const player of currentPlayers){player.finished=false;player.score=0;player.wins=0}
      return current;
    });
    if(!transaction.committed)startLock=false;
  }
  if(room.status==='countdown'||room.status==='playing'||room.status==='betweenRounds'){localStorage.setItem('hst_active_room',room.id);location.replace(`battle.html?room=${room.id}`)}
}
function showLobby(){roomId=null;localStorage.removeItem('hst_active_room');$('#room').hidden=true;$('#lobby').hidden=false}
function formatGame(type){return {reaction:'Reaction Duel',math:'Math Race',typing:'Typing Race'}[type]||type}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}

$('#createPrivate').onclick=()=>createRoom($('#gameType').value,false).catch(error=>showMessage(error.message,'error'));
$('#createPublic').onclick=()=>createRoom($('#gameType').value,true).catch(error=>showMessage(error.message,'error'));
$('#joinForm').onsubmit=event=>{event.preventDefault();joinRoom($('#joinCode').value).catch(error=>showMessage(error.message,'error'))};
$('#ready').onclick=async()=>{try{const current=(await get(ref(rtdb,`rooms/${roomId}/players/${user.uid}/ready`))).val();await set(ref(rtdb,`rooms/${roomId}/players/${user.uid}/ready`),!current)}catch(error){showMessage(`Could not update ready status: ${error.message}`,'error')}};
$('#leave').onclick=async()=>{try{await remove(ref(rtdb,`rooms/${roomId}/players/${user.uid}`));const host=(await get(ref(rtdb,`rooms/${roomId}/host`))).val();if(user.uid===host)await remove(ref(rtdb,`rooms/${roomId}`))}finally{location.href='multiplayer.html'}};
$('#matchmake').onclick=async()=>{try{if(!await requirePlayer())return;showMessage('Looking for an opponent…');const wanted=$('#gameType').value,rounds=selectedRounds(),open=(await get(ref(rtdb,'openRooms'))).val()||{};for(const [id,data] of Object.entries(open)){if(data.type===wanted&&Number(data.rounds||1)===rounds){try{return await joinRoom(id)}catch{await remove(ref(rtdb,`openRooms/${id}`)).catch(()=>{})}}}await createRoom(wanted,true)}catch(error){showMessage(error.message,'error')}};

(async()=>{onValue(ref(rtdb,'.info/serverTimeOffset'),snapshot=>{serverOffset=Number(snapshot.val())||0});if(!await requirePlayer())return;const id=new URLSearchParams(location.search).get('room');if(id)await joinRoom(id).catch(error=>showMessage(error.message,'error'))})();
