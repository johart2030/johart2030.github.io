const HST = {
  keys: {
    reaction: 'hst_reaction_best', number: 'hst_number_best', aim: 'hst_aim_best', sequence: 'hst_sequence_best',
    visual: 'hst_visual_best', typing: 'hst_typing_best', math: 'hst_math_best', pi: 'hst_pi_best'
  },
  lowerIsBetter: new Set(['reaction', 'aim']),
  get(key, fallback = null) {
    const value = localStorage.getItem(this.keys[key]);
    if (value === null) return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  },
  setBest(key, value, lower = this.lowerIsBetter.has(key)) {
    value = Number(value);
    if (!Object.hasOwn(this.keys, key) || !Number.isFinite(value)) return false;
    const old = this.get(key);
    if (old === null || (lower ? value < old : value > old)) {
      localStorage.setItem(this.keys[key], String(value));
      window.dispatchEvent(new CustomEvent('hst:scores-changed', { detail: { key, value } }));
      return true;
    }
    return false;
  },
  completedCount() { return Object.keys(this.keys).filter(key => this.get(key) !== null).length; },
  reset() {
    Object.values(this.keys).forEach(key => localStorage.removeItem(key));
    window.dispatchEvent(new Event('hst:scores-changed'));
    location.reload();
  },
  guardManualInput(element) {
    if (!element || element.dataset.manualGuarded) return;
    element.dataset.manualGuarded = 'true';
    const block = event => event.preventDefault();
    ['paste', 'drop', 'copy', 'cut', 'contextmenu'].forEach(type => element.addEventListener(type, block));
    element.addEventListener('beforeinput', event => {
      if (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop' || event.dataTransfer) event.preventDefault();
    });
    element.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'x'].includes(event.key.toLowerCase())) event.preventDefault();
    });
  }
};

window.HST = HST;

function renderHomeScores() {
  const completed = document.getElementById('completed');
  const topScore = document.getElementById('topScore');
  if (!completed || !topScore) return;
  const total = Object.keys(HST.keys).length;
  const count = HST.completedCount();
  completed.textContent = `${count} / ${total}`;
  topScore.textContent = count === total ? 'All complete' : count ? 'Keep going' : 'Start testing';
  const sync = document.getElementById('syncStatus');
  if (sync) sync.textContent = window.hstUser ? (document.documentElement.dataset.scoreSync === 'ready' ? 'Cloud scores synced' : 'Syncing scores…') : 'Scores saved on this device';
}

document.addEventListener('DOMContentLoaded', () => {
  const menu = document.querySelector('.menu-button');
  const links = document.querySelector('.nav-links');
  if (menu && links) menu.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });
  const page = document.body.dataset.page;
  document.querySelectorAll('[data-nav]').forEach(link => link.classList.toggle('active', link.dataset.nav === page));
  document.querySelectorAll('[data-reset]').forEach(button => button.addEventListener('click', () => {
    if (confirm('Reset all saved scores on this device and in your account?')) window.dispatchEvent(new Event('hst:reset-requested'));
  }));
  document.querySelectorAll('[data-manual-entry]').forEach(element => HST.guardManualInput(element));
  document.querySelectorAll('[data-protected-prompt]').forEach(element => {
    ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'].forEach(type => element.addEventListener(type, event => event.preventDefault()));
  });
  renderHomeScores();
});

window.addEventListener('hst:scores-changed', renderHomeScores);
