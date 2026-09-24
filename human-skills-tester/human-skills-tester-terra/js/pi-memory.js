const PI_DIGITS = '3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679' +
    '82148086513282306647093844609550582231725359408128481117450284102701938521105559644622948954930381964428' +
    '81097566593344612847564823378678316527120190914564856692346034861045432664821339360726024914127372458700' +
    '66063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657';
const START_LENGTH = 4;
const digitsEl = document.getElementById('piDigits');
const levelEl = document.getElementById('level');
const messageEl = document.getElementById('message');
const form = document.getElementById('piForm');
const answer = document.getElementById('piAnswer');
const startOptions = document.getElementById('startOptions');
const startBeginning = document.getElementById('startBeginning');
const continueBest = document.getElementById('continueBest');
const continueHint = document.getElementById('continueHint');
const bestEl = document.getElementById('best');
let level = 0;
let target = '';
let sessionBest = 0;
let startedAt = START_LENGTH;
let revealTimer = 0;
let roundId = 0;
function personalBest() {
    return Math.max(0, Math.min(PI_DIGITS.length, HST.get('pi', 0)));
}
function label(count) {
    return `${count} character${count === 1 ? '' : 's'}`;
}
function displayDigits(value) {
    digitsEl.textContent = value.replace(/(.{4})/g, '$1 ').trim();
}
function showBest() {
    const best = personalBest();
    bestEl.textContent = label(best);
    const canContinue = best > START_LENGTH && best < PI_DIGITS.length;
    continueBest.disabled = !canContinue;
    continueBest.textContent = canContinue ? `Continue at ${label(best)}` : 'Continue at personal best';
    continueHint.textContent = canContinue ? `Resume at your ${label(best)} checkpoint. Pass it to add the next character.` : best >= PI_DIGITS.length ? `You have completed all ${PI_DIGITS.length} available characters.` : 'Reach 5 characters to unlock a faster restart.';
}
function showStartOptions() {
    form.hidden = true;
    answer.disabled = true;
    startOptions.hidden = false;
    continueHint.hidden = false;
    showBest();
}
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
    messageEl.textContent = `Memorize all ${label(level)}, including the decimal point.`;
    form.hidden = true;
    answer.disabled = true;
    clearTimeout(revealTimer);
    const revealFor = Math.min(1200 + level * 230, 7000);
    revealTimer = setTimeout(() => {
        if (thisRound !== roundId)
            return;
        digitsEl.textContent = '• • • •';
        messageEl.textContent = `Enter π through ${label(level)}, including the decimal point.`;
        answer.value = '';
        answer.maxLength = level;
        answer.disabled = false;
        form.hidden = false;
        answer.focus();
    }, revealFor);
}
function startGame(length, mode) {
    clearTimeout(revealTimer);
    level = length;
    startedAt = length;
    sessionBest = length - 1;
    startOptions.hidden = true;
    continueHint.hidden = true;
    HST.logGameEvent('game_started', {
        characters: level,
        mode
    });
    beginRound();
}
function completeDeck() {
    clearTimeout(revealTimer);
    target = PI_DIGITS;
    levelEl.textContent = PI_DIGITS.length;
    displayDigits(target);
    HST.setBest('pi', PI_DIGITS.length);
    HST.logGameEvent('game_finished', {
        result: 'completed_deck',
        characters: PI_DIGITS.length
    });
    messageEl.textContent = `Incredible — you recalled all ${label(PI_DIGITS.length)} available in this challenge.`;
    showStartOptions();
}
function finishGame() {
    clearTimeout(revealTimer);
    displayDigits(target);
    const best = personalBest();
    const progress = sessionBest < startedAt ? `You did not pass the ${label(startedAt)} checkpoint.` : `This run reached ${label(sessionBest)}.`;
    HST.logGameEvent('game_finished', {
        result: 'incorrect',
        startCharacters: startedAt,
        reachedCharacters: sessionBest,
        targetCharacters: level
    });
    messageEl.textContent = `${progress} Your personal best remains ${label(best)}. The correct sequence is shown above.`;
    showStartOptions();
}
startBeginning.addEventListener('click', () => startGame(START_LENGTH, 'beginning'));
continueBest.addEventListener('click', () => {
    const best = personalBest();
    if (best > START_LENGTH && best < PI_DIGITS.length)
        startGame(best, 'personal_best');
});
form.addEventListener('submit', event => {
    event.preventDefault();
    const typed = answer.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    if (typed !== answer.value)
        answer.value = typed;
    if (typed !== target) {
        finishGame();
        return;
    }
    HST.setBest('pi', level);
    sessionBest = level;
    HST.logGameEvent('round_completed', {
        characters: level
    });
    showBest();
    level += 1;
    messageEl.textContent = 'Correct! Adding one more character…';
    answer.disabled = true;
    form.hidden = true;
    revealTimer = setTimeout(beginRound, 650);
});
answer.addEventListener('input', () => {
    answer.value = answer.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, level);
});
showBest();
window.addEventListener('hst:scores-changed', showBest);
