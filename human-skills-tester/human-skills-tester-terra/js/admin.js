import { auth, db, onAuthStateChanged, profileFor, collection, collectionGroup, query, where, limit, getDocs } from './firebase.js';
const status = document.getElementById('adminStatus');
const consoleEl = document.getElementById('adminConsole');
const userList = document.getElementById('userList');
const logList = document.getElementById('logList');
const filter = document.getElementById('userFilter');
const selectedUser = document.getElementById('selectedUser');
const userData = document.getElementById('userData');
let users = [];
let logs = [];
function formatTime(value) {
    const date = value?.toDate?.();
    return date ? date.toLocaleString() : 'Saving timestamp…';
}
function labelFor(user) {
    return user?.usernameKey || user?.displayName || 'Unknown account';
}
function row(title, detail, action) {
    const item = document.createElement('article');
    item.className = 'admin-row';
    const text = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = title;
    const small = document.createElement('small');
    small.textContent = detail;
    text.append(strong, small);
    item.append(text);
    if (action)
        item.append(action);
    return item;
}
function renderUsers() {
    const term = filter.value.trim().toLowerCase();
    userList.replaceChildren();
    const visible = users.filter(user => `${user.usernameKey || ''} ${user.displayName || ''} ${user.email || ''}`.toLowerCase().includes(term));
    if (!visible.length) {
        userList.textContent = 'No matching users.';
        return;
    }
    visible.forEach(user => {
        const button = document.createElement('button');
        button.className = 'button secondary admin-open';
        button.textContent = 'Inspect';
        button.addEventListener('click', () => inspectUser(user));
        userList.append(row(labelFor(user), `${user.email || 'No email'} · ${user.role || 'user'}`, button));
    });
}
function renderLogs() {
    logList.replaceChildren();
    if (!logs.length) {
        logList.textContent = 'No tab-switch logs yet.';
        return;
    }
    logs.forEach(log => logList.append(row(`${log.game || 'game'} · ${log.type || 'event'}`, `${log.ownerLabel || 'Unknown account'} · ${formatTime(log.occurredAt)}`)));
}
async function resolveLogOwners() {
    const knownUsers = new Map(users.map(user => [user.id, user]));
    const missingIds = [...new Set(logs.map(log => log.uid).filter(uid => uid && !knownUsers.has(uid)))];
    const resolved = await Promise.all(missingIds.map(async (uid) => {
        try {
            return [uid, await profileFor(uid)];
        }
        catch {
            return [uid, null];
        }
    }));
    resolved.forEach(([uid, user]) => knownUsers.set(uid, user));
    logs.forEach(log => {
        const profile = knownUsers.get(log.uid);
        log.ownerLabel = log.usernameKey || profile?.usernameKey || log.displayName || profile?.displayName || 'Unknown account';
    });
}
async function inspectUser(user) {
    selectedUser.textContent = `Loading data for ${labelFor(user)}…`;
    userData.hidden = true;
    try {
        const scores = await getDocs(collection(db, 'users', user.id, 'scores'));
        const userLogs = logs.filter(log => log.uid === user.id).map(log => ({
            game: log.game,
            type: log.type,
            occurredAt: formatTime(log.occurredAt)
        }));
        const fields = {
            ...user
        };
        delete fields.id;
        delete fields.uid;
        selectedUser.textContent = `${labelFor(user)} · ${user.email || 'No email'} · ${user.role || 'user'}`;
        userData.textContent = JSON.stringify({
            profile: fields,
            scores: Object.fromEntries(scores.docs.map(score => [score.id, score.data().value])),
            recentTabSwitchLogs: userLogs
        }, null, 2);
        userData.hidden = false;
    }
    catch (error) {
        selectedUser.textContent = `Could not load this user: ${error.message}`;
    }
}
async function loadAdminData() {
    status.textContent = 'Loading users and game logs…';
    try {
        const userSnapshot = await getDocs(query(collection(db, 'users'), limit(200)));
        users = userSnapshot.docs.map(snapshot => ({
            id: snapshot.id,
            ...snapshot.data()
        })).sort((a, b) => labelFor(a).localeCompare(labelFor(b)));
        document.getElementById('userCount').textContent = String(users.length);
        renderUsers();
        try {
            const logSnapshot = await getDocs(query(collectionGroup(db, 'entries'), where('type', '==', 'tab_hidden'), limit(200)));
            logs = logSnapshot.docs.map(snapshot => {
                const path = snapshot.ref.path.split('/');
                return {
                    id: snapshot.id,
                    game: path[1],
                    uid: path[3],
                    ...snapshot.data()
                };
            }).sort((a, b) => (b.occurredAt?.seconds || 0) - (a.occurredAt?.seconds || 0));
            await resolveLogOwners();
            document.getElementById('logCount').textContent = String(logs.length);
            renderLogs();
            status.textContent = 'Administrator access verified. The console shows the latest 200 accounts and potential-cheating tab switches.';
        }
        catch (error) {
            logs = [];
            renderLogs();
            status.textContent = `Users loaded, but the game-log query is unavailable: ${error.message}`;
        }
    }
    catch (error) {
        status.textContent = `Could not load users: ${error.message}`;
    }
}
filter.addEventListener('input', renderUsers);
document.getElementById('refreshAdmin').addEventListener('click', loadAdminData);
onAuthStateChanged(auth, async (user) => {
    if (!user || user.isAnonymous) {
        status.textContent = 'Sign in with an administrator account to use this page.';
        return;
    }
    try {
        const profile = await profileFor(user.uid);
        if (profile?.role !== 'admin') {
            status.textContent = 'This account does not have administrator access.';
            return;
        }
        consoleEl.hidden = false;
        await loadAdminData();
    }
    catch (error) {
        status.textContent = `Access check failed: ${error.message}`;
    }
});
