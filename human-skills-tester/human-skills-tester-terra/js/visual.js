const grid = document.getElementById('grid');
const msg = document.getElementById('message');
const startBtn = document.getElementById('start');
const best = document.getElementById('best');
let level = 1;
let size = 3;
let answers = new Set();
let chosen = new Set();
let accepting = false;
function showBest() {
    best.textContent = HST.get('visual', 0);
}
function build() {
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${size},1fr)`;
    for (let index = 0; index < size * size; index += 1) {
        const button = document.createElement('button');
        button.className = 'visual-cell';
        button.dataset.i = index;
        button.setAttribute('aria-label', `Tile ${index + 1}`);
        button.onclick = pick;
        grid.appendChild(button);
    }
}
function round() {
    size = Math.min(3 + Math.floor((level - 1) / 3), 7);
    build();
    answers = new Set();
    chosen = new Set();
    const count = Math.min(level + 2, size * size - 1);
    while (answers.size < count)
        answers.add(Math.floor(Math.random() * size * size));
    answers.forEach(index => grid.children[index].classList.add('shown'));
    msg.textContent = `Level ${level}: remember ${count} tiles`;
    setTimeout(() => {
        [...grid.children].forEach(cell => cell.classList.remove('shown'));
        accepting = true;
        msg.textContent = 'Select the tiles you remember';
    }, 1200 + level * 80);
}
function pick() {
    if (!accepting)
        return;
    const index = Number(this.dataset.i);
    if (answers.has(index)) {
        this.classList.add('selected');
        chosen.add(index);
        if (chosen.size === answers.size) {
            accepting = false;
            HST.setBest('visual', level);
            HST.logGameEvent('round_completed', {
                level
            });
            showBest();
            level += 1;
            msg.textContent = 'Correct';
            setTimeout(round, 700);
        }
    }
    else {
        this.classList.add('wrong');
        accepting = false;
        answers.forEach(answer => grid.children[answer].classList.add('shown'));
        msg.textContent = `Wrong tile. You reached level ${level}.`;
        HST.logGameEvent('game_finished', {
            result: 'incorrect',
            level
        });
        startBtn.hidden = false;
        startBtn.textContent = 'Try again';
    }
}
startBtn.onclick = () => {
    level = 1;
    startBtn.hidden = true;
    HST.logGameEvent('game_started');
    round();
};
build();
showBest();
window.addEventListener('hst:scores-changed', showBest);
