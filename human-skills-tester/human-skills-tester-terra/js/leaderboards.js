import { db, collection, query, orderBy, limit, getDocs } from './firebase.js';
const tests = {
    reaction: {
        name: 'Reaction Time',
        unit: 'ms',
        lower: true
    },
    number: {
        name: 'Number Memory',
        unit: 'level'
    },
    aim: {
        name: 'Aim Trainer',
        unit: 's',
        lower: true,
        format: v => (v / 1000).toFixed(2)
    },
    sequence: {
        name: 'Sequence Memory',
        unit: 'level'
    },
    visual: {
        name: 'Visual Memory',
        unit: 'level'
    },
    typing: {
        name: 'Typing Test',
        unit: 'WPM'
    },
    math: {
        name: 'Math Sprint',
        unit: 'correct'
    },
    pi: {
        name: 'Pi Memory',
        unit: 'characters'
    }
};
let selected = 'reaction';
let piMode = 'verified';
const $ = s => document.querySelector(s), escape = v => String(v).replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
}[c]));
async function load(key) {
    selected = key;
    document.querySelectorAll('[data-board]').forEach(b => b.classList.toggle('active', b.dataset.board === key));
    const test = tests[key], body = $('#leaderboardBody');
    $('#boardTitle').textContent = test.name;
    const mode = $('#piLeaderboardMode');
    mode.hidden = key !== 'pi';
    document.querySelectorAll('[data-pi-mode]').forEach(button => button.classList.toggle('active', button.dataset.piMode === piMode));
    $('#piLeaderboardModeNote').textContent = piMode === 'verified' ? 'Only runs completed under the current anti-cheat rules are ranked.' : 'All recorded runs are shown here. Legacy and unverified runs are not ranked.';
    body.innerHTML = '<div class="leaderboard-loading">Loading rankings…</div>';
    try {
        const q = query(collection(db, 'leaderboards', key, 'entries'), orderBy('value', test.lower ? 'asc' : 'desc'), limit(100)), snap = await getDocs(q);
        const entries = snap.docs.filter(document => key !== 'pi' || piMode === 'all' || document.data().integrity?.status === 'client_verified');
        if (!entries.length) {
            body.innerHTML = `<div class="empty-state"><h3>${key === 'pi' && piMode === 'verified' ? 'No verified Pi scores yet' : 'No ranked scores yet'}</h3><p>Sign in and complete this test to claim the first spot.</p></div>`;
            return;
        }
        body.innerHTML = entries.map((d, i) => {
            const x = d.data(), value = test.format ? test.format(Number(x.value)) : Number(x.value);
            return `<div class="leaderboard-row"><strong class="rank">${i + 1}</strong><span class="leader-name">${escape(x.displayName || 'Player')}</span><strong class="leader-score">${value} <small>${test.unit}</small></strong></div>`;
        }).join('');
    }
    catch (e) {
        body.innerHTML = `<div class="empty-state"><h3>Leaderboard unavailable</h3><p>${escape(e.message)}</p></div>`;
    }
}
document.querySelectorAll('[data-board]').forEach(b => b.onclick = () => load(b.dataset.board));
document.querySelectorAll('[data-pi-mode]').forEach(button => button.onclick = () => {
    piMode = button.dataset.piMode;
    load('pi');
});
load(selected);
