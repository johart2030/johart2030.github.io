const passages = [
  'Small steps can build strong skills when they are repeated with care and patience.',
  'A clear goal, a calm mind, and steady practice can turn a difficult task into progress.',
  'Good tools should feel simple to use while helping people learn, create, and improve.'
];
const passage = document.getElementById('passage');
const input = document.getElementById('typingInput');
const timeEl = document.getElementById('time');
const wpmEl = document.getElementById('wpm');
const accEl = document.getElementById('accuracy');
const startBtn = document.getElementById('start');
const best = document.getElementById('best');
let text = '';
let startedAt = 0;
let timerId = 0;

function showBest() { best.textContent = `${HST.get('typing', 0)} WPM`; }
function updateStats() {
  if (!startedAt) return;
  const seconds = Math.max((performance.now() - startedAt) / 1000, 0.01);
  const typed = input.value;
  let correct = 0;
  for (let index = 0; index < typed.length; index += 1) if (typed[index] === text[index]) correct += 1;
  const accuracy = typed.length ? Math.round((correct / typed.length) * 100) : 100;
  const wpm = Math.round((correct / 5) / (seconds / 60));
  timeEl.textContent = `${seconds.toFixed(1)} s`;
  wpmEl.textContent = `${wpm} WPM`;
  accEl.textContent = `${accuracy}%`;
  if (typed === text) {
    clearInterval(timerId);
    input.disabled = true;
    HST.setBest('typing', wpm);
    showBest();
    startBtn.hidden = false;
    startBtn.textContent = 'New passage';
  }
}
function startTest() {
  text = passages[Math.floor(Math.random() * passages.length)];
  passage.textContent = text;
  input.value = '';
  input.disabled = false;
  input.focus();
  startedAt = 0;
  clearInterval(timerId);
  timeEl.textContent = '0.0 s';
  wpmEl.textContent = '0 WPM';
  accEl.textContent = '100%';
  startBtn.hidden = true;
}
startBtn.addEventListener('click', startTest);
input.addEventListener('input', () => {
  if (!startedAt) { startedAt = performance.now(); timerId = setInterval(updateStats, 100); }
  updateStats();
});
showBest();
window.addEventListener('hst:scores-changed', showBest);
