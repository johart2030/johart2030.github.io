// This is registered before the site's scripts. The desktop app is already
// installed, so it must never show the browser PWA installation prompt.
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  event.stopImmediatePropagation();
}, { capture: true });
