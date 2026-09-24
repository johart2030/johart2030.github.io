import { auth, db, onAuthStateChanged, addDoc, collection, serverTimestamp, startPerformanceTrace } from './firebase.js';

const folders = { number: 'numbermemory', pi: 'pimemory', typing: 'typing', reaction: 'reaction', aim: 'aim', sequence: 'sequence', visual: 'visualmemory', math: 'math' };
const page = document.body.dataset.page;
const folder = folders[page];
let user = null;
let loggingTabSwitch = false;
let gameTrace = null;

onAuthStateChanged(auth, nextUser => { user = nextUser && !nextUser.isAnonymous ? nextUser : null; });

function gameIsActive() {
  const bySelector = selector => Boolean(document.querySelector(selector));
  const checks = {
    number: () => bySelector('#start[hidden]'), pi: () => bySelector('#startOptions[hidden]'), typing: () => bySelector('#start[hidden]'),
    reaction: () => bySelector('#zone.waiting, #zone.ready'), aim: () => { const target = document.getElementById('target'); return Boolean(target && !target.hidden); },
    sequence: () => bySelector('#start[hidden]'), visual: () => bySelector('#start[hidden]'), math: () => bySelector('#form:not([hidden])')
  };
  return Boolean(checks[page]?.());
}

async function writeLog(type, details = {}) {
  if (!folder || !user) return;
  try {
    await addDoc(collection(db, 'gameLogs', folder, 'users', user.uid, 'entries'), {
      type, game: folder, page, sessionId: sessionStorage.getItem('hst_session_id') || null,
      usernameKey: window.hstProfile?.usernameKey || null,
      displayName: window.hstProfile?.displayName || null,
      details, occurredAt: serverTimestamp()
    });
  } catch (error) { console.warn('Game audit log was not saved', error); }
}

function recordGameEvent(event) {
  const { type, details = {} } = event.detail;
  if (type === 'game_started') {
    gameTrace?.stop();
    gameTrace = startPerformanceTrace(`game_${folder}_session`);
  }
  if (type === 'game_finished' && gameTrace) {
    const resultMetric = Number(details.score ?? details.milliseconds ?? details.reachedLevel ?? details.reachedCharacters ?? 0);
    if (Number.isFinite(resultMetric) && resultMetric >= 0) gameTrace.putMetric('result_value', Math.round(resultMetric));
    gameTrace.stop();
    gameTrace = null;
  }
  void writeLog(type, details);
}
window.__hstGameIntegrityReady = true;
window.addEventListener('hst:game-event', recordGameEvent);
(window.__hstPendingGameEvents || []).forEach(event => recordGameEvent({ detail: event }));
window.__hstPendingGameEvents = [];

document.addEventListener('visibilitychange', () => {
  if (!document.hidden || loggingTabSwitch || !gameIsActive()) return;
  loggingTabSwitch = true;
  writeLog('tab_hidden').finally(() => { loggingTabSwitch = false; });
});
