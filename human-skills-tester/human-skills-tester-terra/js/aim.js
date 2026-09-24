const board = document.getElementById('board');
const target = document.getElementById('target');
const progress = document.getElementById('progress');
const best = document.getElementById('best');
const startBtn = document.getElementById('start');
let hits = 0;
let startedAt = 0;
let active = false;
function showBest() {
    const record = HST.get('aim');
    best.textContent = record === null ? 'Not set' : `${(record / 1000).toFixed(2)} s`;
}
function move() {
    const size = 56;
    target.style.left = `${Math.random() * Math.max(1, board.clientWidth - size)}px`;
    target.style.top = `${Math.random() * Math.max(1, board.clientHeight - size)}px`;
}
startBtn.onclick = () => {
    hits = 0;
    startedAt = 0;
    active = true;
    progress.textContent = '0 / 20';
    startBtn.hidden = true;
    target.hidden = false;
    HST.logGameEvent('game_started', {
        targetCount: 20
    });
    move();
};
target.onclick = event => {
    event.stopPropagation();
    if (!active)
        return;
    if (!startedAt)
        startedAt = performance.now();
    hits += 1;
    if (hits === 20) {
        const milliseconds = Math.round(performance.now() - startedAt);
        active = false;
        target.hidden = true;
        progress.textContent = `Finished: ${(milliseconds / 1000).toFixed(2)} s`;
        HST.setBest('aim', milliseconds, true);
        HST.logGameEvent('game_finished', {
            result: 'completed',
            milliseconds,
            hits
        });
        showBest();
        startBtn.hidden = false;
        startBtn.textContent = 'Try again';
    }
    else {
        progress.textContent = `${hits} / 20`;
        move();
    }
};
showBest();
window.addEventListener('hst:scores-changed', showBest);
