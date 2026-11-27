const { app, BrowserWindow, BrowserView, ipcMain, shell } = require('electron');
const path = require('path');

const APP_ORIGIN = 'https://johart2030.github.io';
const APP_PATH = '/human-skills-tester/human-skills-tester-terra/';
const APP_URL = `${APP_ORIGIN}${APP_PATH}index.html`;
const NAV_HEIGHT = 92;
const pageViews = new Map();
let mainWindow;
let activeView;
let activeKey = '';
let accountState = { signed: false, isAdmin: false, name: '' };

function isAppUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.origin === APP_ORIGIN && url.pathname.startsWith(APP_PATH);
  } catch {
    return false;
  }
}

function isTrustedUrl(rawUrl) {
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

function pageKey(rawUrl) {
  const url = new URL(rawUrl, APP_URL);
  return `${url.pathname}${url.search}`;
}

function pageName(rawUrl) {
  const file = new URL(rawUrl, APP_URL).pathname.split('/').pop() || 'index.html';
  return ({
    'index.html': 'home',
    'multiplayer.html': 'multiplayer',
    'friends.html': 'friends',
    'leaderboards.html': 'leaderboards',
    'settings.html': 'settings',
    'admin.html': 'admin'
  })[file] || '';
}

function sendShellState(partial = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('hst-shell:state', {
    page: pageName(activeKey),
    loading: false,
    account: accountState,
    ...partial
  });
}

function resizeViews() {
  if (!mainWindow) return;
  const { width, height } = mainWindow.getContentBounds();
  for (const view of pageViews.values()) {
    view.setBounds({ x: 0, y: NAV_HEIGHT, width: 1, height: 1 });
  }
  if (activeView) {
    activeView.setBounds({ x: 0, y: NAV_HEIGHT, width, height: Math.max(1, height - NAV_HEIGHT) });
    activeView.setAutoResize({ width: true, height: true });
  }
}

function attachViewHandlers(view) {
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedUrl(url)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  view.webContents.on('will-navigate', (event, url) => {
    if (isAppUrl(url)) {
      event.preventDefault();
      showPage(url);
      return;
    }
    if (!isTrustedUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  view.webContents.on('did-start-loading', () => {
    if (view === activeView) sendShellState({ loading: true });
  });
  view.webContents.on('did-stop-loading', () => {
    if (view === activeView) sendShellState({ loading: false });
  });
  view.webContents.on('did-finish-load', () => {
    view.webContents.insertCSS('.site-header,.site-footer{display:none!important}body{min-height:100vh!important}').catch(() => {});
    if (view === activeView) sendShellState();
  });
}

function createPageView(url) {
  const view = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });
  attachViewHandlers(view);
  mainWindow.addBrowserView(view);
  view.webContents.loadURL(url);
  return view;
}

function showPage(rawUrl) {
  if (!isAppUrl(rawUrl)) return;
  const url = new URL(rawUrl, APP_URL).href;
  const key = pageKey(url);
  let view = pageViews.get(key);
  if (!view) {
    view = createPageView(url);
    pageViews.set(key, view);
  }
  activeView = view;
  activeKey = key;
  mainWindow.setTopBrowserView(view);
  resizeViews();
  sendShellState({ loading: view.webContents.isLoading() });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 760,
    minHeight: 620,
    autoHideMenuBar: true,
    backgroundColor: '#09111f',
    title: 'Human Skills Tester Terra',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'shell-preload.cjs')
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'shell.html'));
  mainWindow.once('ready-to-show', () => showPage(APP_URL));
  mainWindow.on('resize', resizeViews);
  mainWindow.on('closed', () => {
    activeView = null;
    mainWindow = null;
    pageViews.clear();
  });
}

ipcMain.on('hst-shell:navigate', (_event, url) => showPage(url));
ipcMain.on('hst-desktop:navigate', (_event, url) => showPage(url));
ipcMain.on('hst-desktop:account', (event, state = {}) => {
  if (!activeView || event.sender !== activeView.webContents) return;
  accountState = {
    signed: Boolean(state.signed),
    isAdmin: Boolean(state.isAdmin),
    name: typeof state.name === 'string' ? state.name : ''
  };
  sendShellState();
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
