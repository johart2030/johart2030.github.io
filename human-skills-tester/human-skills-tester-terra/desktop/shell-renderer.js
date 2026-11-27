const ROOT = 'https://johart2030.github.io/human-skills-tester/human-skills-tester-terra/';
const buttons = [...document.querySelectorAll('.pill-nav button')];
const connection = document.querySelector('.connection');
const connectionText = document.getElementById('connectionText');
const gamesToggle = document.getElementById('gamesToggle');
const gamesList = document.getElementById('gamesList');
let account = { signed: false, isAdmin: false, name: '' };

function navigate(button) {
  if (button.dataset.page === 'admin' && !account.isAdmin) return;
  window.desktopShell.navigate(new URL(button.dataset.url, ROOT).href);
  gamesList.hidden = true;
  gamesToggle.setAttribute('aria-expanded', 'false');
}

buttons.forEach(button => button.addEventListener('click', () => navigate(button)));
gamesToggle.addEventListener('click', () => {
  gamesList.hidden = !gamesList.hidden;
  gamesToggle.setAttribute('aria-expanded', String(!gamesList.hidden));
});
gamesList.querySelectorAll('button[data-url]').forEach(button => button.addEventListener('click', () => navigate(button)));
document.addEventListener('click', event => {
  if (!event.target.closest('.games-menu')) {
    gamesList.hidden = true;
    gamesToggle.setAttribute('aria-expanded', 'false');
  }
});

window.desktopShell.onState(state => {
  account = state.account || account;
  buttons.forEach(button => button.classList.toggle('active', button.dataset.page === state.page));
  gamesToggle.classList.toggle('active', state.page === 'games');
  document.querySelector('[data-page="admin"]').hidden = !account.isAdmin;
  connection.classList.toggle('loading', Boolean(state.profileLoading || state.loading));
  connection.classList.toggle('ready', !state.profileLoading && !state.loading);
  connectionText.textContent = state.profileLoading || state.loading
    ? 'Loading profile'
    : account.signed
      ? `Connected as ${account.name || 'Player'}`
      : 'Guest session ready';
});
