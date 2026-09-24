import { auth, db, onAuthStateChanged, signOut, signInAnonymously, profileFor, doc, setDoc, serverTimestamp, ref, set, onValue, onDisconnect, rtdbTimestamp, rtdb } from './firebase.js';
let resolved = false;
export const ready = new Promise(resolve => onAuthStateChanged(auth, async (user) => {
    if (!user && !resolved) {
        resolved = true;
        try {
            await signInAnonymously(auth);
            return;
        }
        catch (error) {
            console.warn('Anonymous auth unavailable', error);
        }
    }
    resolved = true;
    window.hstUser = user || null;
    let profile = null;
    if (user && !user.isAnonymous) {
        try {
            profile = await profileFor(user.uid);
            if (profile && !profile.role) {
                await setDoc(doc(db, 'users', user.uid), {
                    role: 'user',
                    updatedAt: serverTimestamp()
                }, {
                    merge: true
                });
                profile = {
                    ...profile,
                    role: 'user'
                };
            }
            if (profile?.displayName)
                await ensurePublicProfile(user, profile);
        }
        catch (error) {
            console.warn('Profile migration failed', error);
        }
    }
    window.hstProfile = profile;
    paint(user, profile);
    if (user)
        setupPresence(user, profile);
    resolve({
        user,
        profile
    });
}));
async function ensurePublicProfile(user, profile) {
    await setDoc(doc(db, 'publicProfiles', user.uid), {
        uid: user.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL || user.photoURL || '',
        usernameKey: profile.usernameKey || profile.displayName.toLowerCase(),
        statsVisible: profile.statsVisible !== false,
        activityVisible: profile.activityVisible !== false,
        joinPolicy: profile.joinPolicy || 'friends',
        updatedAt: serverTimestamp()
    }, {
        merge: true
    });
}
function paint(user, profile) {
    const signed = user && !user.isAnonymous;
    const adminLink = signed && profile?.role === 'admin' ? '<a href="admin.html" class="account-pill">Admin</a>' : '';
    document.querySelectorAll('[data-auth-area]').forEach(element => {
        element.innerHTML = signed
            ? `<a href="profile.html" class="account-pill">${escapeHtml(profile?.displayName || user.displayName || 'Finish profile')}</a>${adminLink}<button class="nav-signout" data-signout>Sign out</button>`
            : '<a href="login.html" class="account-pill">Sign in</a>';
    });
    document.querySelectorAll('[data-signout]').forEach(button => button.onclick = async () => {
        await signOut(auth);
        location.href = 'index.html';
    });
}
function setupPresence(user, profile) {
    const sid = sessionStorage.getItem('hst_session_id') || crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    sessionStorage.setItem('hst_session_id', sid);
    const session = ref(rtdb, `activeSessions/${user.uid}/${sid.replace(/[.#$\[\]/]/g, '_')}`);
    const connected = ref(rtdb, '.info/connected');
    onValue(connected, async (snapshot) => {
        if (!snapshot.val())
            return;
        try {
            await onDisconnect(session).remove();
            await set(session, {
                state: 'online',
                signedIn: !user.isAnonymous,
                displayName: user.isAnonymous ? 'Guest' : profile?.displayName || user.displayName || 'Player',
                lastChanged: rtdbTimestamp()
            });
            if (!user.isAnonymous) {
                const social = ref(rtdb, `socialPresence/${user.uid}`);
                await onDisconnect(social).set({
                    state: 'offline',
                    lastSeen: rtdbTimestamp()
                });
                await set(social, {
                    state: 'online',
                    activity: 'browsing',
                    joinable: false,
                    lastSeen: rtdbTimestamp()
                });
            }
        }
        catch (error) {
            console.warn('Presence unavailable', error);
        }
    });
    onValue(ref(rtdb, 'activeSessions'), snapshot => {
        let count = 0;
        snapshot.forEach(uid => {
            if (uid.exists())
                count += 1;
        });
        document.querySelectorAll('[data-online-count]').forEach(element => element.textContent = String(count));
        document.querySelectorAll('[data-online-label]').forEach(element => element.textContent = count === 1 ? 'player online' : 'players online');
    }, error => console.warn('Online count unavailable', error));
}
function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[character]));
}
