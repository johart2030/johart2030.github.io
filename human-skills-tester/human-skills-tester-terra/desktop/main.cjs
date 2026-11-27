const { app, BrowserWindow, BrowserView, ipcMain, shell } = require('electron');
const path = require('path');

const APP_ORIGIN = 'https://johart2030.github.io';
const APP_PATH = '/human-skills-tester/human-skills-tester-terra/';
const APP_URL = `${APP_ORIGIN}${APP_PATH}index.html`;
const NAV_HEIGHT = 92;
const PRELOAD_PAGES = [
  'index.html',
  'tests.html',
  'reaction.html',
  'number-memory.html',
  'pi-memory.html',
  'aim.html',
  'sequence.html',
  'visual-memory.html',
  'typing.html',
  'math.html',
  'multiplayer.html',
  'friends.html',
  'leaderboards.html',
  'settings.html',
  'admin.html'
];
const pageViews = new Map();
let mainWindow;
let activeView;
let activeKey = '';
let accountState = { signed: false, isAdmin: false, name: '' };
let profileLoading = true;
let loadingPages = new Set();
let profilePages = new Set();
let profileLoadingTimeout;

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
    'admin.html': 'admin',
    'tests.html': 'tests',
    'reaction.html': 'games',
    'number-memory.html': 'games',
    'pi-memory.html': 'games',
    'aim.html': 'games',
    'sequence.html': 'games',
    'visual-memory.html': 'games',
    'typing.html': 'games',
    'math.html': 'games'
  })[file] || '';
}

function sendShellState(partial = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('hst-shell:state', {
    page: pageName(activeKey),
    loading: false,
    profileLoading,
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
    loadingPages.delete(view);
    finishProfileRefreshIfReady();
    if (view === activeView) sendShellState();
  });
  view.webContents.on('did-fail-load', (_event, code, _description, _url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    loadingPages.delete(view);
    profilePages.delete(view);
    finishProfileRefreshIfReady();
  });
}

function finishProfileRefreshIfReady() {
  if (profileLoading && loadingPages.size === 0 && profilePages.size === 0) finishProfileRefresh();
}

function finishProfileRefresh() {
  clearTimeout(profileLoadingTimeout);
  profileLoadingTimeout = null;
  profileLoading = false;
  loadingPages.clear();
  profilePages.clear();
  sendShellState();
}

function refreshAllPages() {
  const views = [...pageViews.values()].filter(view => !view.webContents.isDestroyed());
  if (!views.length) return;
  profileLoading = true;
  loadingPages = new Set(views);
  profilePages = new Set(views);
  sendShellState();
  clearTimeout(profileLoadingTimeout);
  profileLoadingTimeout = setTimeout(finishProfileRefresh, 25000);
  for (const view of views) view.webContents.reload();
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
  if (profileLoading) {
    loadingPages.add(view);
    profilePages.add(view);
  }
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
  view.webContents.send('hst-desktop:page-active');
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
  mainWindow.once('ready-to-show', () => {
    for (const page of PRELOAD_PAGES) {
      const url = `${APP_ORIGIN}${APP_PATH}${page}`;
      if (!pageViews.has(pageKey(url))) pageViews.set(pageKey(url), createPageView(url));
    }
    resizeViews();
  });
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
  const sourceView = [...pageViews.values()].find(view => view.webContents === event.sender);
  if (!sourceView) return;
  profilePages.delete(sourceView);
  const nextState = {
    signed: Boolean(state.signed),
    isAdmin: Boolean(state.isAdmin),
    name: typeof state.name === 'string' ? state.name : ''
  };
  const changed = nextState.signed !== accountState.signed || nextState.isAdmin !== accountState.isAdmin || nextState.name !== accountState.name;
  accountState = {
    ...nextState
  };
  if (changed && !profileLoading) refreshAllPages();
  sendShellState();
  finishProfileRefreshIfReady();
});
ipcMain.on('hst-desktop:global-change', event => {
  if (![...pageViews.values()].some(view => view.webContents === event.sender)) return;
  refreshAllPages();
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
