if ('serviceWorker' in navigator)
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(console.warn));

// Electron is already a desktop installation. Suppress the browser-only PWA
// installation banner there, while leaving it unchanged on the public site.
const isDesktopShell = /\bElectron\//.test(navigator.userAgent);
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    if (isDesktopShell)
        return;
    deferredInstall = event;
    if (document.querySelector('.install-banner'))
        return;
    const banner = document.createElement('aside');
    banner.className = 'install-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Install Human Skills Tester Terra');
    banner.innerHTML = '<span><strong>Install Human Skills Tester Terra</strong><small>Play from your home screen.</small></span><div><button class="button" data-install>Install</button><button class="install-later" data-later>Later</button></div>';
    banner.querySelector('[data-install]').onclick = async () => {
        if (!deferredInstall)
            return banner.remove();
        await deferredInstall.prompt();
        await deferredInstall.userChoice;
        deferredInstall = null;
        banner.remove();
    };
    banner.querySelector('[data-later]').onclick = () => banner.remove();
    document.body.appendChild(banner);
});
window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    document.querySelector('.install-banner')?.remove();
});
