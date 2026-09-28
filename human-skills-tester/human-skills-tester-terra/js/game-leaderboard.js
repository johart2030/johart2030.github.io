import { db, collection, query, orderBy, limit, getDocs } from './firebase.js';

const boards = {
    reaction: { name: 'Reaction Time', unit: 'ms', lower: true },
    number: { name: 'Number Memory', unit: 'level' },
    aim: { name: 'Aim Trainer', unit: 's', lower: true, format: value => (value / 1000).toFixed(2) },
    sequence: { name: 'Sequence Memory', unit: 'level' },
    visual: { name: 'Visual Memory', unit: 'level' },
    typing: { name: 'Typing Test', unit: 'WPM' },
    math: { name: 'Math Sprint', unit: 'correct' },
    pi: { name: 'Pi Memory', unit: 'characters' }
};

const key = document.body.dataset.page;
const board = boards[key];

function row(rank, entry, board) {
    const item = document.createElement('div');
    item.className = 'leaderboard-row';
    const rankEl = document.createElement('strong');
    rankEl.className = 'rank';
    rankEl.textContent = String(rank);
    const name = document.createElement('span');
    name.className = 'leader-name';
    name.textContent = entry.displayName || 'Player';
    const score = document.createElement('strong');
    score.className = 'leader-score';
    const value = Number(entry.value);
    score.textContent = `${board.format ? board.format(value) : value} `;
    const unit = document.createElement('small');
    unit.textContent = board.unit;
    score.append(unit);
    item.append(rankEl, name, score);
    return item;
}

async function mount() {
    const panel = document.querySelector('.game-panel');
    if (!panel || !board || document.querySelector('.game-leaderboard')) return;
    const section = document.createElement('section');
    section.className = 'game-leaderboard leaderboard-card';
    section.setAttribute('aria-labelledby', 'gameLeaderboardTitle');
    section.innerHTML = `<div class="leaderboard-head"><div><p class="eyebrow">Global rankings</p><h2 id="gameLeaderboardTitle">${board.name} leaderboard</h2></div><a class="button secondary" href="leaderboards.html">All leaderboards</a></div>`;
    const body = document.createElement('div');
    body.className = 'game-leaderboard-body';
    body.textContent = 'Loading top scores…';
    section.append(body);
    panel.insertAdjacentElement('afterend', section);
    try {
        const snapshot = await getDocs(query(collection(db, 'leaderboards', key, 'entries'), orderBy('value', board.lower ? 'asc' : 'desc'), limit(10)));
        body.replaceChildren();
        if (snapshot.empty) {
            body.textContent = 'No ranked scores yet. Sign in and finish this test to claim the first spot.';
            return;
        }
        snapshot.docs.forEach((document, index) => body.append(row(index + 1, document.data(), board)));
    } catch (error) {
        body.textContent = 'Leaderboard is unavailable right now. Please try again shortly.';
        console.warn('Could not load game leaderboard', error);
    }
}

mount();
