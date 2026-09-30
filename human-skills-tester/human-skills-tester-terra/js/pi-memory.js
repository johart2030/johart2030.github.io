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
const integrityStatus = document.getElementById('integrityStatus');
const integrityDecision = document.getElementById('integrityDecision');
const integrityDecisionMessage = document.getElementById('integrityDecisionMessage');
const endRankedRun = document.getElementById('endRankedRun');
const continuePracticeRun = document.getElementById('continuePracticeRun');
let level = 0;
let target = '';
let sessionBest = 0;
let startedAt = START_LENGTH;
let revealTimer = 0;
let roundId = 0;
let runId = '';
let runStartedAt = 0;
let answerStartedAt = 0;
let pendingInput = null;
let integrityIssues = [];
let runActive = false;
let integrityReview = null;
function updateIntegrityStatus() {
    integrityStatus.textContent = !runActive ? 'Start a run to become leaderboard eligible.' : integrityReview ? 'Leaderboard review required: choose how to continue.' : integrityIssues.length ? 'Practice only: this run is not eligible for the public leaderboard.' : 'Leaderboard eligible: keep this challenge in the foreground.';
}
function requestIntegrityDecision(reason, details = {}) {
    if (!runActive || integrityIssues.some(issue => issue.reason === reason) || integrityReview) return;
    integrityReview = { reason, ...details };
    HST.logGameEvent('integrity_flag', { reason, level, ...details, decisionRequired: true });
    integrityDecisionMessage.textContent = 'This run detected activity that cannot be used for a public leaderboard score. You can end this run now, or continue as a personal practice run.';
    integrityDecision.hidden = false;
    answer.disabled = true;
    form.querySelector('button').disabled = true;
    updateIntegrityStatus();
}
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
    updateIntegrityStatus();
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
        pendingInput = null;
        answerStartedAt = performance.now();
        answer.maxLength = level;
        answer.disabled = Boolean(integrityReview);
        form.hidden = false;
        form.querySelector('button').disabled = Boolean(integrityReview);
        if (!integrityReview) answer.focus();
    }, revealFor);
}
function startGame(length, mode) {
    clearTimeout(revealTimer);
    level = length;
    startedAt = length;
    sessionBest = length - 1;
    runId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    runStartedAt = performance.now();
    integrityIssues = [];
    runActive = true;
    integrityReview = null;
    integrityDecision.hidden = true;
    startOptions.hidden = true;
    continueHint.hidden = true;
    HST.logGameEvent('game_started', {
        characters: level,
        mode
    });
    updateIntegrityStatus();
    beginRound();
}
function completeDeck() {
    clearTimeout(revealTimer);
    target = PI_DIGITS;
    levelEl.textContent = PI_DIGITS.length;
    displayDigits(target);
    HST.logGameEvent('game_finished', {
        result: 'completed_deck',
        characters: PI_DIGITS.length
    });
    runActive = false;
    messageEl.textContent = integrityIssues.length ? `You recalled all ${label(PI_DIGITS.length)} available in practice. This run is not listed publicly.` : `Incredible — you recalled all ${label(PI_DIGITS.length)} available in this challenge.`;
    showStartOptions();
}
function approvePiScore(score) {
    const entryMilliseconds = Math.round(performance.now() - answerStartedAt);
    const minimumEntryMilliseconds = Math.max(700, score * 55);
    if (entryMilliseconds < minimumEntryMilliseconds) requestIntegrityDecision('impossibly_fast_entry', { score, entryMilliseconds, minimumEntryMilliseconds });
    if (integrityIssues.length || integrityReview) return false;
    HST.approveScore('pi', score, {
        status: 'client_verified',
        runId,
        score,
        runMilliseconds: Math.round(performance.now() - runStartedAt),
        entryMilliseconds,
        manualInput: true
    });
    return true;
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
    runActive = false;
    messageEl.textContent = `${progress} Your personal best remains ${label(best)}.${integrityIssues.length ? ' This practice run is not listed publicly.' : ''} The correct sequence is shown above.`;
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
    if (!event.isTrusted) {
        requestIntegrityDecision('untrusted_submission', { level });
        return;
    }
    const typed = answer.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    if (typed !== answer.value)
        answer.value = typed;
    if (typed !== target) {
        finishGame();
        return;
    }
    approvePiScore(level);
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
answer.addEventListener('beforeinput', event => {
    const accepted = event.inputType === 'insertText' && event.data && /^[0-9.]$/.test(event.data);
    const deletion = ['deleteContentBackward', 'deleteContentForward'].includes(event.inputType);
    if (!event.isTrusted) {
        event.preventDefault();
        requestIntegrityDecision('untrusted_input', { inputType: event.inputType || 'unknown' });
        return;
    }
    if (!accepted && !deletion) {
        event.preventDefault();
        return;
    }
    pendingInput = { value: answer.value, insertion: accepted ? event.data : null };
});
answer.addEventListener('input', event => {
    const changedByOne = pendingInput && Math.abs(answer.value.length - pendingInput.value.length) === 1;
    if (!event.isTrusted || (pendingInput?.insertion && !changedByOne)) requestIntegrityDecision('unexpected_input_change', { length: answer.value.length });
    answer.value = answer.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, level);
    pendingInput = null;
});
window.addEventListener('blur', () => {
    if (runActive) requestIntegrityDecision('focus_lost_during_pi_run', { level, phase: form.hidden ? 'memorizing' : 'answering' });
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden && runActive) requestIntegrityDecision('tab_hidden_during_pi_run', { level, phase: form.hidden ? 'memorizing' : 'answering' });
});
continuePracticeRun.addEventListener('click', () => {
    if (!integrityReview) return;
    integrityIssues.push(integrityReview);
    integrityReview = null;
    integrityDecision.hidden = true;
    updateIntegrityStatus();
    if (!form.hidden) {
        answer.disabled = false;
        form.querySelector('button').disabled = false;
        answer.focus();
    }
});
endRankedRun.addEventListener('click', () => {
    if (!integrityReview) return;
    integrityIssues.push(integrityReview);
    integrityReview = null;
    integrityDecision.hidden = true;
    finishGame();
});
showBest();
window.addEventListener('hst:scores-changed', showBest);
