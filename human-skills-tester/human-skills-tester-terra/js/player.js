import { auth, db, rtdb, onAuthStateChanged, doc, getDoc, ref, onValue } from './firebase.js';
const $ = s => document.querySelector(s), tests = {
    reaction: ['Reaction', 'ms'],
    number: ['Number Memory', 'level'],
    aim: ['Aim', 'seconds'],
    sequence: ['Sequence', 'level'],
    visual: ['Visual', 'level'],
    typing: ['Typing', 'WPM'],
    math: ['Math', 'correct']
};
let target;

function activityLabel(presence, activityVisible) {
    if (presence.state !== 'online') return 'Offline';
    if (!activityVisible) return 'Online';
    if (presence.activity !== 'multiplayer') return 'Online · Browsing Human Skills Tester';
    const game = presence.gameType ? `${presence.gameType[0].toUpperCase()}${presence.gameType.slice(1)}` : 'game';
    return `${presence.joinable ? 'Waiting in' : 'Playing'} ${game}${presence.rounds ? ` · ${presence.rounds} round${presence.rounds === 1 ? '' : 's'}` : ''}`;
}

function renderPresence(presence, activityVisible) {
    const online = presence.state === 'online';
    $('#playerPresence').textContent = activityLabel(presence, activityVisible);
    const join = online && activityVisible && presence.joinable && presence.roomId;
    $('#profileJoin').hidden = !join;
    if (join) $('#profileJoin').href = `multiplayer.html?room=${encodeURIComponent(presence.roomId)}`;
}
async function boot() {
    await new Promise(resolve => {
        const stop = onAuthStateChanged(auth, () => {
            stop();
            resolve();
        });
    });
    target = new URLSearchParams(location.search).get('uid');
    if (!target)
        throw new Error('Missing player ID.');
    const pub = await getDoc(doc(db, 'publicProfiles', target));
    let data = pub.exists() ? pub.data() : null;
    if (!data) {
        for (const key of Object.keys(tests)) {
            const score = await getDoc(doc(db, 'leaderboards', key, 'entries', target));
            if (score.exists()) {
                data = {
                    uid: target,
                    displayName: score.data().displayName || 'Player',
                    statsVisible: true
                };
                break;
            }
        }
    }
    if (!data)
        throw new Error('This player has not opened the updated site yet. Ask them to open Profile or Settings once.');
    $('#playerAvatar').textContent = (data.displayName || '?')[0].toUpperCase();
    $('#playerName').textContent = data.displayName || 'Player';
    renderPresence({}, data.activityVisible !== false);
    const stopPresence = onValue(ref(rtdb, `socialPresence/${target}`), snapshot => {
        renderPresence(snapshot.val() || {}, data.activityVisible !== false);
    }, () => renderPresence({}, data.activityVisible !== false));
    window.addEventListener('pagehide', stopPresence, { once: true });
    if (data.statsVisible === false) {
        $('#statsGrid').innerHTML = '<div class="empty-state">This player keeps their stats private.</div>';
        return;
    }
    const rows = [];
    for (const [key, [name, unit]] of Object.entries(tests)) {
        const snap = await getDoc(doc(db, 'leaderboards', key, 'entries', target));
        let value = 'Not set';
        if (snap.exists()) {
            let n = Number(snap.data().value);
            if (key === 'aim')
                n = (n / 1000).toFixed(2);
            value = `${n} ${unit}`;
        }
        rows.push(`<article class="stat-card"><span>${name}</span><strong>${value}</strong></article>`);
    }
    $('#statsGrid').innerHTML = rows.join('');
}
function showError(text) {
    document.querySelector('main').innerHTML = `<section class="game-panel"><h1>Profile unavailable</h1><p class="message">${text}</p><a class="button" href="friends.html">Back to friends</a></section>`;
}
boot().catch(e => showError(e.message));
