const problem = document.getElementById('problem');
const form = document.getElementById('form');
const input = document.getElementById('answer');
const timeEl = document.getElementById('time');
const scoreEl = document.getElementById('score');
const msg = document.getElementById('message');
const startBtn = document.getElementById('start');
const best = document.getElementById('best');
let solution = 0;
let score = 0;
let end = 0;
let timer = 0;
function showBest() {
    best.textContent = HST.get('math', 0);
}
function next() {
    const operator = ['+', '-', '×'][Math.floor(Math.random() * 3)];
    let left = Math.floor(Math.random() * 20) + 1;
    let right = Math.floor(Math.random() * 20) + 1;
    if (operator === '-' && right > left)
        [left, right] = [right, left];
    if (operator === '×') {
        left = Math.floor(Math.random() * 11) + 2;
        right = Math.floor(Math.random() * 11) + 2;
    }
    solution = operator === '+' ? left + right : operator === '-' ? left - right : left * right;
    problem.textContent = `${left} ${operator} ${right}`;
    input.value = '';
    input.focus();
}
function tick() {
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    timeEl.textContent = left;
    if (left <= 0) {
        clearInterval(timer);
        form.hidden = true;
        problem.textContent = 'Time!';
        msg.textContent = `Final score: ${score}`;
        HST.setBest('math', score);
        HST.logGameEvent('game_finished', {
            result: 'time_expired',
            score
        });
        showBest();
        startBtn.hidden = false;
        startBtn.textContent = 'Try again';
    }
}
startBtn.onclick = () => {
    score = 0;
    scoreEl.textContent = 0;
    end = Date.now() + 60000;
    form.hidden = false;
    startBtn.hidden = true;
    msg.textContent = 'Keep going';
    HST.logGameEvent('game_started', {
        durationSeconds: 60
    });
    next();
    timer = setInterval(tick, 200);
    tick();
};
form.onsubmit = event => {
    event.preventDefault();
    if (Number(input.value) === solution) {
        score += 1;
        scoreEl.textContent = score;
        msg.textContent = 'Correct';
        next();
    }
    else {
        msg.textContent = 'Try that one again';
        input.select();
    }
};
showBest();
window.addEventListener('hst:scores-changed', showBest);
