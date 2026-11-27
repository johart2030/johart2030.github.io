const ROOT = 'https://johart2030.github.io/human-skills-tester/human-skills-tester-terra/';
const buttons = [...document.querySelectorAll('.pill-nav button')];
const connection = document.querySelector('.connection');
const connectionText = document.getElementById('connectionText');
let account = { signed: false, isAdmin: false, name: '' };

buttons.forEach(button => button.addEventListener('click', () => {
  if (button.dataset.page === 'admin' && !account.isAdmin) return;
  window.desktopShell.navigate(new URL(button.dataset.url, ROOT).href);
}));

window.desktopShell.onState(state => {
  account = state.account || account;
  buttons.forEach(button => button.classList.toggle('active', button.dataset.page === state.page));
  document.querySelector('[data-page="admin"]').hidden = !account.isAdmin;
  connection.classList.toggle('ready', !state.loading);
  connectionText.textContent = state.loading
    ? 'Loading…'
    : account.signed
      ? `Connected as ${account.name || 'Player'}`
      : 'Guest session ready';
});
