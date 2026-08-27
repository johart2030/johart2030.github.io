import {auth,rtdb,ref,get,onValue,onDisconnect,update,runRTDBTransaction,rtdbTimestamp,profileFor,onAuthStateChanged} from './firebase.js';

const $=s=>document.querySelector(s),roomId=(new URLSearchParams(location.search).get('room')||'').toUpperCase();
let user,profile,room,serverOffset=0,gameStarted=false,finished=false,timer=null,started=0,score=0,solution=0,roomUnsub=null;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function waitForAuth(){return new Promise(resolve=>{if(auth.currentUser)return resolve(auth.currentUser);const stop=onAuthStateChanged(auth,u=>{stop();resolve(u)})})}
function status(text){$('#battleStatus').textContent=text}
function fail(text,retry=true){$('#arena').innerHTML=`<div class="empty-state"><h2>${text}</h2><p class="message">${retry?'Your place may still be recoverable.':''}</p><div class="controls">${retry?'<button id="retryJoin" class="button">Reconnect</button>':''}<a class="button secondary" href="multiplayer.html">Back to multiplayer</a></div></div>`;if(retry)$('#retryJoin').onclick=()=>location.reload()}
async function ensureMembership(){
  let snap=await get(ref(rtdb,`rooms/${roomId}`));if(!snap.exists())throw new Error('Room no longer exists.');let current=snap.val();
  if(current.players?.[user.uid])return current;
  const saved=localStorage.getItem('hst_active_room');
  if(saved!==roomId)throw new Error('You are not registered for this match.');
  status('Restoring your place in the match…');
  const tx=await runRTDBTransaction(ref(rtdb,`rooms/${roomId}`),r=>{
    if(!r)return;const players=r.players||{};if(players[user.uid])return r;
    players[user.uid]={name:profile.displayName,ready:true,finished:false,score:0,connected:true,joinedAt:Date.now()+serverOffset,lastSeen:Date.now()+serverOffset};r.players=players;return r;
  });
  if(!tx.committed)throw new Error('Your player slot could not be restored.');
  return tx.snapshot.val();
}
async function boot(){
  if(!/^[A-Z0-9]{6}$/.test(roomId))return fail('Invalid room link.',false);
  status('Restoring your account…');
  user=await waitForAuth();if(!user||user.isAnonymous){sessionStorage.setItem('hst_after_auth',location.href);return location.replace(`login.html?next=${encodeURIComponent('battle.html?room='+roomId)}`)}
  profile=await profileFor(user.uid);if(!profile)return location.replace('setup-profile.html');
  await new Promise(resolve=>{const stop=onValue(ref(rtdb,'.info/serverTimeOffset'),s=>{serverOffset=Number(s.val())||0;stop();resolve()},{onlyOnce:true})});
  try{room=await ensureMembership()}catch(e){return fail(e.message)}
  const playerRef=ref(rtdb,`rooms/${roomId}/players/${user.uid}`);
  await onDisconnect(playerRef).update({connected:false,lastSeen:rtdbTimestamp()});
  await update(playerRef,{connected:true,lastSeen:rtdbTimestamp()});
  $('#battleTitle').textContent=({reaction:'Reaction Duel',math:'Math Race',typing:'Typing Race'})[room.type]||'Live Match';
  roomUnsub=onValue(ref(rtdb,`rooms/${roomId}`),snap=>{if(!snap.exists())return fail('The room was closed.',false);room=snap.val();renderPlayers(room);scheduleStart(room)},e=>fail(`Connection failed: ${e.message}`));
}
function renderPlayers(r){
  const entries=Object.entries(r.players||{});$('#battlePlayers').innerHTML=entries.map(([uid,p])=>`<span class="result-chip"><i class="presence-dot ${p.connected?'online':'offline'}"></i>${escapeHtml(p.name)}: ${p.finished?p.score:'playing'}</span>`).join('');
  if(entries.length>=2&&entries.every(([,p])=>p.finished)){const vals=entries.map(([,p])=>p),best=r.type==='reaction'?Math.min(...vals.map(p=>p.score)):Math.max(...vals.map(p=>p.score)),mine=r.players[user.uid]?.score,winners=vals.filter(p=>p.score===best).length;$('#outcome').textContent=mine===best?(winners===1?'You win!':'Tie game'):'Opponent wins';$('#rematch').hidden=false;status('Match complete')}
}
function scheduleStart(r){
  if(gameStarted||!['countdown','playing'].includes(r.status)||!r.startAt)return;
  gameStarted=true;const tick=()=>{const left=r.startAt-(Date.now()+serverOffset);if(left>0){status(`Starting in ${Math.max(1,Math.ceil(left/1000))}…`);timer=setTimeout(tick,Math.min(250,left));return}status('Go!');startGame(r)};tick();
}
function startGame(r){if(r.type==='reaction')reaction(r);else if(r.type==='math')math(r);else if(r.type==='typing')typing(r);if(r.host===user.uid&&r.status==='countdown')update(ref(rtdb,`rooms/${roomId}`),{status:'playing'}).catch(console.warn)}
function reaction(r){const delay=1200+(r.seed%2200);$('#game').innerHTML='<button id="reaction" class="reaction-zone waiting"><span><strong class="readout">Wait</strong><small>Do not tap early</small></span></button>';const z=$('#reaction');let ready=false;timer=setTimeout(()=>{ready=true;started=performance.now();z.className='reaction-zone ready';z.innerHTML='<span><strong class="readout">Tap!</strong><small>Now</small></span>'},delay);z.onclick=()=>{if(finished)return;if(!ready){clearTimeout(timer);finish(9999,'False start')}else finish(Math.round(performance.now()-started),`${Math.round(performance.now()-started)} ms`)}}
function seeded(seed){let x=(seed||1)%2147483647;return()=>((x=x*16807%2147483647)-1)/2147483646}
function math(r){const rand=seeded(r.seed),end=Date.now()+30000;$('#game').innerHTML='<div class="result-row"><span id="timeLeft" class="result-chip">30 seconds</span><span id="myScore" class="result-chip">0 correct</span></div><div id="problem" class="math-problem"></div><form id="answerForm" class="controls"><input id="answer" class="input" type="number" inputmode="numeric" autocomplete="off"><button class="button">Answer</button></form>';function next(){const a=2+Math.floor(rand()*18),b=2+Math.floor(rand()*12);solution=a+b;$('#problem').textContent=`${a} + ${b}`;$('#answer').value='';$('#answer').focus()}$('#answerForm').onsubmit=e=>{e.preventDefault();if(Number($('#answer').value)===solution){score++;$('#myScore').textContent=`${score} correct`;next()}else $('#answer').select()};next();timer=setInterval(()=>{const left=Math.max(0,Math.ceil((end-Date.now())/1000));$('#timeLeft').textContent=`${left} seconds`;if(left<=0){clearInterval(timer);finish(score,`${score} correct`)}},200)}
function typing(r){const texts=['Practice makes progress when every player stays focused and calm.','Fast fingers help, but careful accuracy wins the final typing race.'],text=texts[r.seed%texts.length];$('#game').innerHTML=`<div class="typing-text">${text}</div><textarea id="typeInput" class="typing-input" placeholder="Type the passage exactly" autocapitalize="off" autocomplete="off" spellcheck="false"></textarea><div class="progress-track"><i id="typeProgress"></i></div><p id="typingStat" class="message">Start typing</p>`;const inp=$('#typeInput');inp.oninput=()=>{if(!started)started=performance.now();let correct=0;for(let i=0;i<inp.value.length;i++)if(inp.value[i]===text[i])correct++;const pct=Math.min(100,Math.round(correct/text.length*100));$('#typeProgress').style.width=`${pct}%`;$('#typingStat').textContent=`${pct}% complete`;if(inp.value===text){const sec=(performance.now()-started)/1000,wpm=Math.round((text.length/5)/(sec/60));finish(wpm,`${wpm} WPM`)}};inp.focus()}
async function finish(value,label){if(finished)return;finished=true;status(label);await update(ref(rtdb,`rooms/${roomId}/players/${user.uid}`),{score:value,finished:true,finishedAt:rtdbTimestamp(),connected:true})}
$('#rematch').onclick=async()=>{if(room.host!==user.uid){await update(ref(rtdb,`rooms/${roomId}/players/${user.uid}`),{ready:true,finished:false,score:0});location.replace(`multiplayer.html?room=${roomId}`);return}const tx=await runRTDBTransaction(ref(rtdb,`rooms/${roomId}`),r=>{if(!r)return;r.status='waiting';delete r.startAt;delete r.seed;for(const p of Object.values(r.players||{})){p.ready=false;p.finished=false;p.score=0}return r});if(tx.committed)location.replace(`multiplayer.html?room=${roomId}`)};
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
boot().catch(e=>fail(e.message));
