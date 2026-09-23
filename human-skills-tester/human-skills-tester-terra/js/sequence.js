const pads = [...document.querySelectorAll('.sequence-pad')];
const msg = document.getElementById('message');
const startBtn = document.getElementById('start');
const best = document.getElementById('best');
let sequence = [];
let position = 0;
let accepting = false;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function showBest() { best.textContent = HST.get('sequence', 0); }
async function show() { accepting = false; msg.textContent = `Level ${sequence.length}: watch`; await sleep(500); for (const pad of sequence) { pads[pad].classList.add('flash'); await sleep(420); pads[pad].classList.remove('flash'); await sleep(180); } position = 0; accepting = true; msg.textContent = 'Your turn'; }
function next() { sequence.push(Math.floor(Math.random() * 4)); show(); }
startBtn.onclick = () => { sequence = []; startBtn.hidden = true; HST.logGameEvent('game_started'); next(); };
pads.forEach((pad, index) => pad.onclick = () => { if (!accepting) return; pad.classList.add('flash'); setTimeout(() => pad.classList.remove('flash'), 140); if (index !== sequence[position]) { accepting = false; msg.textContent = `Wrong pad. You reached level ${sequence.length}.`; HST.logGameEvent('game_finished', { result: 'incorrect', level: sequence.length }); startBtn.hidden = false; startBtn.textContent = 'Try again'; return; } position += 1; if (position === sequence.length) { accepting = false; HST.setBest('sequence', sequence.length); HST.logGameEvent('round_completed', { level: sequence.length }); showBest(); msg.textContent = 'Correct'; setTimeout(next, 700); } });
showBest();
window.addEventListener('hst:scores-changed', showBest);
