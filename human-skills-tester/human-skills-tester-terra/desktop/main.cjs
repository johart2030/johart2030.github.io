const { app, BrowserWindow, shell } = require('electron');

const APP_URL = 'https://johart2030.github.io/human-skills-tester/human-skills-tester-terra/index.html';
let mainWindow;

function isTrustedAppUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && (
      url.hostname === 'johart2030.github.io' ||
      url.hostname === 'human-skills-tester.firebaseapp.com' ||
      url.hostname.endsWith('.firebaseapp.com') ||
      url.hostname === 'accounts.google.com'
    );
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 420,
    minHeight: 620,
    autoHideMenuBar: true,
    backgroundColor: '#f4f7fb',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: `${__dirname}/preload.cjs`
    }
  });

  // Keep the game itself on the existing deployed web app. This means its
  // Firebase configuration, PWA behavior, and all game logic stay unchanged.
  mainWindow.loadURL(APP_URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedAppUrl(url)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isTrustedAppUrl(url)) return;
    event.preventDefault();
    shell.openExternal(url);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
