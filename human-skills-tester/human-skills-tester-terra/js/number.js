const out = document.getElementById('number');
const msg = document.getElementById('message');
const form = document.getElementById('form');
const input = document.getElementById('answer');
const startBtn = document.getElementById('start');
const best = document.getElementById('best');
let level = 1;
let current = '';

function showBest() { best.textContent = HST.get('number', 0); }
function round() {
  current = Array.from({ length: level + 2 }, () => Math.floor(Math.random() * 10)).join('');
  out.textContent = current;
  msg.textContent = `Level ${level}`;
  form.hidden = true;
  startBtn.hidden = true;
  setTimeout(() => {
    out.textContent = '?';
    msg.textContent = 'What was the number?';
    form.hidden = false;
    input.value = '';
    input.maxLength = current.length;
    input.focus();
  }, Math.min(1500 + level * 250, 4500));
}

startBtn.onclick = () => {
  level = 1;
  HST.logGameEvent('game_started', { level });
  round();
};
input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, current.length); });
form.onsubmit = event => {
  event.preventDefault();
  if (input.value === current) {
    HST.setBest('number', level);
    showBest();
    HST.logGameEvent('round_completed', { level });
    level += 1;
    msg.textContent = 'Correct';
    setTimeout(round, 650);
  } else {
    out.textContent = current;
    msg.textContent = `Not quite. You reached level ${level}.`;
    HST.logGameEvent('game_finished', { reachedLevel: level - 1, result: 'incorrect' });
    form.hidden = true;
    startBtn.hidden = false;
    startBtn.textContent = 'Try again';
  }
};
showBest();
window.addEventListener('hst:scores-changed', showBest);
