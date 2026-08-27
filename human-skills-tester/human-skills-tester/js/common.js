const HST = {
  keys: {
    reaction: 'hst_reaction_best', number: 'hst_number_best', aim: 'hst_aim_best',
    sequence: 'hst_sequence_best', visual: 'hst_visual_best', typing: 'hst_typing_best', math: 'hst_math_best'
  },
  get(key, fallback = null) { const value = localStorage.getItem(this.keys[key]); return value === null ? fallback : Number(value); },
  setBest(key, value, lowerIsBetter = false) {
    const old = this.get(key);
    if (old === null || (lowerIsBetter ? value < old : value > old)) { localStorage.setItem(this.keys[key], String(value)); return true; }
    return false;
  },
  completedCount() { return Object.keys(this.keys).filter(k => this.get(k) !== null).length; },
  reset() { Object.values(this.keys).forEach(k => localStorage.removeItem(k)); location.reload(); }
};
document.addEventListener('DOMContentLoaded', () => {
  const menu = document.querySelector('.menu-button');
  const links = document.querySelector('.nav-links');
  if (menu && links) menu.addEventListener('click', () => { const open = links.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
  const page = document.body.dataset.page;
  document.querySelectorAll('[data-nav]').forEach(a => { if (a.dataset.nav === page) a.classList.add('active'); });
  document.querySelectorAll('[data-reset]').forEach(b => b.addEventListener('click', () => { if (confirm('Reset every saved personal best?')) HST.reset(); }));
});
