const { contextBridge, ipcRenderer } = require('electron');

// This is registered before the site's scripts. The desktop app is already
// installed, so it must never show the browser PWA installation prompt.
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  event.stopImmediatePropagation();
}, { capture: true });

contextBridge.exposeInMainWorld('hstDesktop', {
  navigate: url => ipcRenderer.send('hst-desktop:navigate', url),
  setAccount: state => ipcRenderer.send('hst-desktop:account', state),
  globalChange: () => ipcRenderer.send('hst-desktop:global-change')
});

window.addEventListener('hst:global-setting-changed', () => window.hstDesktop.globalChange());
window.addEventListener('hst:global-profile-changed', () => window.hstDesktop.globalChange());

window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || link.target || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== 'https://johart2030.github.io' || !url.pathname.startsWith('/human-skills-tester/human-skills-tester-terra/'))
      return;
    event.preventDefault();
    ipcRenderer.send('hst-desktop:navigate', url.href);
  }, true);
});
