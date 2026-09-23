import { auth, db, onAuthStateChanged, addDoc, collection, serverTimestamp } from './firebase.js';

const folders = { number: 'numbermemory', pi: 'pimemory', typing: 'typing', reaction: 'reaction', aim: 'aim', sequence: 'sequence', visual: 'visualmemory', math: 'math' };
const page = document.body.dataset.page;
const folder = folders[page];
let user = null;
let logging = false;

onAuthStateChanged(auth, nextUser => { user = nextUser && !nextUser.isAnonymous ? nextUser : null; });

function gameIsActive() {
  const bySelector = selector => Boolean(document.querySelector(selector));
  const checks = {
    number: () => bySelector('#start[hidden]'),
    pi: () => bySelector('#start[hidden]'),
    typing: () => bySelector('#start[hidden]'),
    reaction: () => bySelector('#zone.waiting, #zone.ready'),
    aim: () => { const target = document.getElementById('target'); return Boolean(target && !target.hidden); },
    sequence: () => bySelector('#start[hidden]'),
    visual: () => bySelector('#start[hidden]'),
    math: () => bySelector('#form:not([hidden])')
  };
  return Boolean(checks[page]?.());
}

async function logTabSwitch() {
  if (!folder || !user || logging || !gameIsActive()) return;
  logging = true;
  try {
    await addDoc(collection(db, 'gameLogs', folder, 'users', user.uid.usernameKey, 'entries'), {
      type: 'tab_hidden',
      game: folder,
      page,
      sessionId: sessionStorage.getItem('hst_session_id') || null,
      occurredAt: serverTimestamp()
    });
  } catch (error) {
    console.warn('Game integrity log was not saved', error);
  } finally {
    logging = false;
  }
}

document.addEventListener('visibilitychange', () => { if (document.hidden) void logTabSwitch(); });
