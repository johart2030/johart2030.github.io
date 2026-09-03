import {auth,rtdb,ref,get,onValue,onDisconnect,update,runRTDBTransaction,rtdbTimestamp,profileFor,onAuthStateChanged} from './firebase.js';

const $=selector=>document.querySelector(selector);
const roomId=(new URLSearchParams(location.search).get('room')||'').toUpperCase();
let user=null,profile=null,room=null,serverOffset=0,activeRound=0,gameStarted=false,finished=false,timer=null,started=0,score=0,solution=0,advancingRound=0;

function waitForAuth(){return new Promise(resolve=>{if(auth.currentUser)return resolve(auth.currentUser);const stop=onAuthStateChanged(auth,current=>{stop();resolve(current)})})}
function setStatus(text){const el=$('#battleStatus');if(el)el.textContent=text}
function fail(text,retry=true){$('#arena').innerHTML=`<div class="empty-state"><h2>${escapeHtml(text)}</h2><p class="message">${retry?'Your place may still be recoverable.':''}</p><div class="controls">${retry?'<button id="retryJoin" class="button">Reconnect</button>':''}<a class="button secondary" href="multiplayer.html">Back to multiplayer</a></div></div>`;if(retry)$('#retryJoin').onclick=()=>location.reload()}
async function ensureMembership(){
  const snapshot=await get(ref(rtdb,`rooms/${roomId}`));if(!snapshot.exists())throw new Error('Room no longer exists.');const current=snapshot.val();
  if(current.players?.[user.uid])return current;
  if(localStorage.getItem('hst_active_room')!==roomId)throw new Error('You are not registered for this match.');
  setStatus('Restoring your place in the match…');
  const transaction=await runRTDBTransaction(ref(rtdb,`rooms/${roomId}`),value=>{if(!value)return;const players=value.players||{};if(players[user.uid])return value;players[user.uid]={name:profile.displayName,ready:true,finished:false,score:0,wins:0,connected:true,joinedAt:Date.now()+serverOffset,lastSeen:Date.now()+serverOffset};value.players=players;return value});
  if(!transaction.committed)throw new Error('Your player slot could not be restored.');return transaction.snapshot.val();
}
async function boot(){
  if(!/^[A-Z0-9]{6}$/.test(roomId))return fail('Invalid room link.',false);
  setStatus('Restoring your account…');user=await waitForAuth();
  if(!user||user.isAnonymous){sessionStorage.setItem('hst_after_auth',location.href);return location.replace(`login.html?next=${encodeURIComponent('battle.html?room='+roomId)}`)}
  profile=await profileFor(user.uid);if(!profile)return location.replace('setup-profile.html');
  await new Promise(resolve=>{const stop=onValue(ref(rtdb,'.info/serverTimeOffset'),snapshot=>{serverOffset=Number(snapshot.val())||0;stop();resolve()},{onlyOnce:true})});
  try{room=await ensureMembership()}catch(error){return fail(error.message)}
  const playerRef=ref(rtdb,`rooms/${roomId}/players/${user.uid}`);await onDisconnect(playerRef).update({connected:false,lastSeen:rtdbTimestamp()});await update(playerRef,{connected:true,lastSeen:rtdbTimestamp()});
  $('#battleTitle').textContent=({reaction:'Reaction Duel',math:'Math Race',typing:'Typing Race'})[room.type]||'Live Match';
  onValue(ref(rtdb,`rooms/${roomId}`),snapshot=>{if(!snapshot.exists())return fail('The room was closed.',false);room=snapshot.val();handleRoom(room).catch(error=>fail(error.message))},error=>fail(`Connection failed: ${error.message}`));
}
async function handleRoom(current){
  renderScoreboard(current);
  if(current.status==='complete'){showFinalResults(current);return}
  const round=Number(current.currentRound||1);
  if(round!==activeRound){clearCurrentGame();activeRound=round;gameStarted=false;finished=Boolean(current.players?.[user.uid]?.finished);score=0;started=0;renderRoundHeader(current)}
  if(current.status==='countdown')scheduleRound(current);
  if(current.host===user.uid&&allPlayersFinished(current)&&advancingRound!==round){advancingRound=round;await advanceMatch(round)}
}
function renderRoundHeader(current){const rounds=Number(current.rounds||1),round=Number(current.currentRound||1);$('#roundLabel').textContent=`Round ${round} of ${rounds}`;$('#roundProgress').style.width=`${Math.round((round-1)/rounds*100)}%`;$('#outcome').textContent='';$('#rematch').hidden=true}
function renderScoreboard(current){
  const entries=Object.entries(current.players||{});
  $('#battlePlayers').innerHTML=entries.map(([uid,p])=>`<div class="battle-player ${uid===user.uid?'is-you':''}"><span><i class="presence-dot ${p.connected?'online':'offline'}"></i>${escapeHtml(p.name)}${uid===user.uid?' <small>You</small>':''}</span><strong>${Number(p.wins||0)} ${Number(p.wins||0)===1?'win':'wins'}</strong><em>${p.finished?formatRoundScore(current.type,p.score):'Playing'}</em></div>`).join('');
}
function allPlayersFinished(current){const players=Object.values(current.players||{});return players.length>=2&&players.every(player=>player.finished===true)}
async function advanceMatch(expectedRound){
  const transaction=await runRTDBTransaction(ref(rtdb,`rooms/${roomId}`),current=>{
    if(!current||current.host!==user.uid||Number(current.currentRound||1)!==expectedRound)return;
    const players=Object.values(current.players||{});if(players.length<2||!players.every(player=>player.finished===true))return;
    const values=players.map(player=>Number(player.score));const best=current.type==='reaction'?Math.min(...values):Math.max(...values);
    for(const player of players){if(Number(player.score)===best)player.wins=Number(player.wins||0)+1}
    const rounds=Number(current.rounds||1);
    if(expectedRound>=rounds){current.status='complete';current.completedAt=Date.now()+serverOffset;return current}
    current.currentRound=expectedRound+1;current.status='countdown';current.seed=Math.floor(Math.random()*1e9);current.startAt=Date.now()+serverOffset+5000;
    for(const player of players){player.finished=false;player.score=0}
    return current;
  });
  if(!transaction.committed)advancingRound=0;
}
function scheduleRound(current){
  if(gameStarted||!current.startAt)return;gameStarted=true;
  const tick=()=>{const left=Number(current.startAt)-(Date.now()+serverOffset);if(left>0){setStatus(`Round ${current.currentRound} starts in ${Math.max(1,Math.ceil(left/1000))}…`);timer=setTimeout(tick,Math.min(250,left));return}setStatus(`Round ${current.currentRound}: Go!`);startGame(current);if(current.host===user.uid&&current.status==='countdown')update(ref(rtdb,`rooms/${roomId}`),{status:'playing'}).catch(console.warn)};tick();
}
function startGame(current){finished=false;score=0;started=0;if(current.type==='reaction')reaction(current);else if(current.type==='math')math(current);else if(current.type==='typing')typing(current)}
function reaction(current){
  const delay=1200+((Number(current.seed)+Number(current.currentRound)*37)%2200);$('#game').innerHTML='<button id="reaction" class="reaction-zone waiting"><span><strong class="readout">Wait</strong><small>Do not tap early</small></span></button>';const zone=$('#reaction');let ready=false;
  timer=setTimeout(()=>{ready=true;started=performance.now();zone.className='reaction-zone ready';zone.innerHTML='<span><strong class="readout">Tap!</strong><small>Now</small></span>'},delay);
  zone.onclick=()=>{if(finished)return;if(!ready){clearTimeout(timer);finishRound(9999,'False start')}else{const milliseconds=Math.round(performance.now()-started);finishRound(milliseconds,`${milliseconds} ms`)}}
}
function seeded(seed){let value=(seed||1)%2147483647;return()=>((value=value*16807%2147483647)-1)/2147483646}
function math(current){
  const random=seeded(Number(current.seed)+Number(current.currentRound)*101),end=Date.now()+30000;$('#game').innerHTML='<div class="result-row"><span id="timeLeft" class="result-chip">30 seconds</span><span id="myScore" class="result-chip">0 correct</span></div><div id="problem" class="math-problem"></div><form id="answerForm" class="controls"><input id="answer" class="input" type="number" inputmode="numeric" autocomplete="off"><button class="button">Answer</button></form>';
  function next(){const a=2+Math.floor(random()*18),b=2+Math.floor(random()*12);solution=a+b;$('#problem').textContent=`${a} + ${b}`;$('#answer').value='';$('#answer').focus()}
  $('#answerForm').onsubmit=event=>{event.preventDefault();if(Number($('#answer').value)===solution){score++;$('#myScore').textContent=`${score} correct`;next()}else $('#answer').select()};next();
  timer=setInterval(()=>{const left=Math.max(0,Math.ceil((end-Date.now())/1000));$('#timeLeft').textContent=`${left} seconds`;if(left<=0){clearInterval(timer);finishRound(score,`${score} correct`)}},200)
}
function typing(current){
  const passages=['Practice makes progress when every player stays focused and calm.','Fast fingers help, but careful accuracy wins the final typing race.','Steady hands and a clear mind can make every challenge feel possible.','Quick thinking matters most when accuracy stays high from start to finish.'];const text=passages[(Number(current.seed)+Number(current.currentRound))%passages.length];
  $('#game').innerHTML=`<div class="typing-text">${text}</div><textarea id="typeInput" class="typing-input" placeholder="Type the passage exactly" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false"></textarea><div class="progress-track"><i id="typeProgress"></i></div><p id="typingStat" class="message">Start typing</p>`;
  const input=$('#typeInput');input.oninput=()=>{if(!started)started=performance.now();let correct=0;for(let i=0;i<input.value.length;i++)if(input.value[i]===text[i])correct++;const percent=Math.min(100,Math.round(correct/text.length*100));$('#typeProgress').style.width=`${percent}%`;$('#typingStat').textContent=`${percent}% complete`;if(input.value===text){const seconds=(performance.now()-started)/1000,wpm=Math.round((text.length/5)/(seconds/60));finishRound(wpm,`${wpm} WPM`)}};input.focus();
}
async function finishRound(value,label){if(finished)return;finished=true;setStatus(`${label} · Waiting for other players…`);disableGame();await update(ref(rtdb,`rooms/${roomId}/players/${user.uid}`),{score:Number(value),finished:true,finishedAt:rtdbTimestamp(),connected:true})}
function disableGame(){document.querySelectorAll('#game button,#game input,#game textarea').forEach(element=>element.disabled=true)}
function clearCurrentGame(){if(timer){clearTimeout(timer);clearInterval(timer);timer=null}$('#game').innerHTML='<div class="round-wait"><div class="spinner"></div><p>Preparing the next round…</p></div>'}
function showFinalResults(current){
  clearCurrentGame();const entries=Object.entries(current.players||{}),highest=Math.max(...entries.map(([,p])=>Number(p.wins||0))),winners=entries.filter(([,p])=>Number(p.wins||0)===highest),mine=Number(current.players?.[user.uid]?.wins||0);
  $('#roundLabel').textContent=`${current.rounds} rounds complete`;$('#roundProgress').style.width='100%';$('#outcome').textContent=mine===highest?(winners.length===1?'You are the champion!':'The competition is a tie!'):`${escapeHtml(winners.map(([,p])=>p.name).join(', '))} won the competition`;
  $('#game').innerHTML=`<div class="podium-list">${entries.sort((a,b)=>Number(b[1].wins||0)-Number(a[1].wins||0)).map(([uid,p],index)=>`<div class="podium-row ${index===0?'first':''}"><strong>${index+1}</strong><span>${escapeHtml(p.name)}${uid===user.uid?' <small>You</small>':''}</span><b>${Number(p.wins||0)} ${Number(p.wins||0)===1?'win':'wins'}</b></div>`).join('')}</div>`;$('#rematch').hidden=false;setStatus('Competition complete')
}
$('#rematch').onclick=async()=>{
  if(room.host!==user.uid){setStatus('Waiting for the host to start a rematch…');return}
  const transaction=await runRTDBTransaction(ref(rtdb,`rooms/${roomId}`),current=>{if(!current)return;current.status='waiting';current.currentRound=1;delete current.startAt;delete current.seed;delete current.completedAt;for(const player of Object.values(current.players||{})){player.ready=false;player.finished=false;player.score=0;player.wins=0}return current});if(transaction.committed)location.replace(`multiplayer.html?room=${roomId}`)
};
function formatRoundScore(type,value){const number=Number(value);if(type==='reaction')return number===9999?'False start':`${number} ms`;if(type==='typing')return `${number} WPM`;return `${number} correct`}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
boot().catch(error=>fail(error.message));
