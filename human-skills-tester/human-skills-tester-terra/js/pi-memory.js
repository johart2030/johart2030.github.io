const PI_DIGITS = '3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679' +
  '82148086513282306647093844609550582231725359408128481117450284102701938521105559644622948954930381964428' +
  '81097566593344612847564823378678316527120190914564856692346034861045432664821339360726024914127372458700' +
  '66063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657';
const digitsEl = document.getElementById('piDigits');
const levelEl = document.getElementById('level');
const messageEl = document.getElementById('message');
const form = document.getElementById('piForm');
const answer = document.getElementById('piAnswer');
const startButton = document.getElementById('start');
const bestEl = document.getElementById('best');
let level = 0;
let reached = 0;
let target = '';
let revealTimer = 0;
let roundId = 0;
function showBest() { const best = HST.get('pi', 0); bestEl.textContent = `${best} character${best === 1 ? '' : 's'}`; }
function displayDigits(value) { digitsEl.textContent = value.replace(/(.{4})/g, '$1 ').trim(); }
function beginRound() {
  if (level > PI_DIGITS.length) {
    completeDeck();
    return;
  }
  roundId += 1;
  const thisRound = roundId;
  target = PI_DIGITS.slice(0, level);
  levelEl.textContent = level;
  displayDigits(target);
  messageEl.textContent = `Memorize all ${level} character${level === 1 ? '' : 's'}, including the decimal point.`;
  form.hidden = true;
  startButton.hidden = true;
  answer.disabled = true;
  clearTimeout(revealTimer);
  const revealFor = Math.min(1200 + level * 230, 7000);
  revealTimer = setTimeout(() => {
    if (thisRound !== roundId) return;
    digitsEl.textContent = '• • • •';
    messageEl.textContent = `Enter π through ${level} character${level === 1 ? '' : 's'}, including the decimal point.`;
    answer.value = '';
    answer.maxLength = level;
    answer.disabled = false;
    form.hidden = false;
    answer.focus();
  }, revealFor);
}
function startGame() { clearTimeout(revealTimer); level = 4; reached = 0; HST.logGameEvent('game_started', { characters: level }); beginRound(); }
function completeDeck() {
  clearTimeout(revealTimer);
  target = PI_DIGITS;
  levelEl.textContent = PI_DIGITS.length;
  displayDigits(target);
  form.hidden = true;
  answer.disabled = true;
  HST.setBest('pi', PI_DIGITS.length);
  HST.logGameEvent('game_finished', { result: 'completed_deck', characters: PI_DIGITS.length });
  showBest();
  messageEl.textContent = `Incredible — you recalled all ${PI_DIGITS.length} available characters in this challenge.`;
  startButton.hidden = false;
  startButton.textContent = 'Play again';
}
function finishGame() {
  clearTimeout(revealTimer);
  displayDigits(target);
  showBest();
  HST.logGameEvent('game_finished', { result: 'incorrect', reachedCharacters: reached, targetCharacters: level });
  answer.disabled = true;
  form.hidden = true;
  messageEl.textContent = `Close! You reached ${reached} character${reached === 1 ? '' : 's'}. The correct ${level}-character sequence is shown above.`;
  startButton.hidden = false;
  startButton.textContent = 'Try again';
}
startButton.addEventListener('click', startGame);
form.addEventListener('submit', event => {
  event.preventDefault();
  const typed = answer.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  if (typed !== answer.value) answer.value = typed;
  if (typed === target) {
    HST.setBest('pi', level);
    reached = level;
    HST.logGameEvent('round_completed', { characters: level });
    showBest();
    level += 1;
    messageEl.textContent = 'Correct! Adding one more character…';
    answer.disabled = true;
    form.hidden = true;
    revealTimer = setTimeout(beginRound, 650);
  } else finishGame();
});
answer.addEventListener('input', () => { answer.value = answer.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, level); });
showBest();
window.addEventListener('hst:scores-changed', showBest);
