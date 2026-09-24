const zone = document.getElementById('zone');
const value = document.getElementById('reactionValue');
const msg = document.getElementById('reactionMessage');
const best = document.getElementById('best');
let state = 'idle';
let timer = 0;
let startedAt = 0;
function showBest() {
    const record = HST.get('reaction');
    best.textContent = record === null ? 'Not set' : `${record} ms`;
}
function begin() {
    clearTimeout(timer);
    state = 'waiting';
    HST.logGameEvent('game_started');
    zone.className = 'reaction-zone waiting';
    value.textContent = 'Wait';
    msg.textContent = 'Do not click yet';
    timer = setTimeout(() => {
        state = 'ready';
        startedAt = performance.now();
        zone.className = 'reaction-zone ready';
        value.textContent = 'Click!';
        msg.textContent = 'Now';
    }, 1500 + Math.random() * 3000);
}
function act() {
    if (state === 'idle' || state === 'result') {
        begin();
        return;
    }
    if (state === 'waiting') {
        clearTimeout(timer);
        state = 'idle';
        zone.className = 'reaction-zone';
        value.textContent = 'Too early';
        msg.textContent = 'Click to try again';
        HST.logGameEvent('game_finished', {
            result: 'too_early'
        });
        return;
    }
    if (state === 'ready') {
        const milliseconds = Math.round(performance.now() - startedAt);
        state = 'result';
        zone.className = 'reaction-zone';
        value.textContent = `${milliseconds} ms`;
        msg.textContent = HST.setBest('reaction', milliseconds, true) ? 'New personal best!' : 'Click to test again';
        HST.logGameEvent('game_finished', {
            result: 'completed',
            milliseconds
        });
        showBest();
    }
}
zone.addEventListener('click', act);
zone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        act();
    }
});
showBest();
window.addEventListener('hst:scores-changed', showBest);
