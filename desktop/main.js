const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');

const SITE_URL = 'https://jul1-art.github.io/Kwizy/';
const MIN_WIDTH = 900;
const MIN_HEIGHT = 600;
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 820;

// Single instance lock: focusing the existing window instead of a double launch
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.setAppUserModelId('fr.kwizy.app');
app.setName('Kwizy');

let mainWindow = null;

// ---------------------------------------------------------------------------
// Window state persistence (size/position remembered between launches)
// ---------------------------------------------------------------------------
function stateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  try {
    const raw = fs.readFileSync(stateFile(), 'utf8');
    const state = JSON.parse(raw);
    return {
      width: Number.isInteger(state.width) ? state.width : DEFAULT_WIDTH,
      height: Number.isInteger(state.height) ? state.height : DEFAULT_HEIGHT,
      x: Number.isInteger(state.x) ? state.x : undefined,
      y: Number.isInteger(state.y) ? state.y : undefined,
      maximized: Boolean(state.maximized),
    };
  } catch {
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, maximized: false };
  }
}

function saveWindowState(win) {
  try {
    if (win.isDestroyed()) return;
    const bounds = win.getNormalBounds();
    fs.writeFileSync(
      stateFile(),
      JSON.stringify({
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        maximized: win.isMaximized(),
      }, null, 2)
    );
  } catch {
    // State persistence is best-effort, never fatal
  }
}

// ---------------------------------------------------------------------------
// Offline fallback page shown when the site cannot be reached
// ---------------------------------------------------------------------------
const OFFLINE_PAGE = 'data:text/html;charset=utf-8,' + encodeURIComponent([
  '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">',
  '<title>Kwizy — Hors ligne</title>',
  '<style>body{font-family:system-ui,sans-serif;background:#f8f9fa;color:#1c1c1c;',
  'display:flex;min-height:100vh;align-items:center;justify-content:center;flex-direction:column;gap:1.2rem;}',
  'h1{font-size:1.3rem;margin:0;}p{margin:0;opacity:.7;max-width:32rem;text-align:center;line-height:1.5;}',
  'button{border:none;background:#0070FF;color:#fff;font-weight:700;padding:.8rem 1.6rem;border-radius:10px;',
  'cursor:pointer;font-size:.95rem;}button:hover{background:#005ecb;}</style></head>',
  '<body><h1>📡 Kwizy est hors ligne</h1>',
  '<p>L\'application n\'arrive pas à joindre le serveur Kwizy. ',
  'Vérifie ta connexion Internet puis réessaie — tes données locales ne sont pas perdues.</p>',
  `<button onclick="location.href='${SITE_URL}'">Réessayer</button></body></html>`,
].join(''));

// ---------------------------------------------------------------------------
// Main window
// ---------------------------------------------------------------------------
function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    backgroundColor: '#f8f9fa',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  if (state.maximized) mainWindow.maximize();

  // The site has its own loader; show the window once it is actually painted
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // External links (GitHub, sponsors…) open in the default browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('data:') && !url.startsWith(SITE_URL)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Fullscreen (student exam mode), notifications and clipboard writes are the
  // features the web app legitimately needs; everything else stays denied.
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    const granted = ['fullscreen', 'notifications', 'clipboard-sanitized-write'];
    callback(granted.includes(permission));
  });

  // Auto-recovery when the connection drops during use
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return; // -3 = aborted, harmless
    mainWindow.loadURL(OFFLINE_PAGE).catch(() => {});
  });

  if (process.env.KWIZY_SMOKE_TEST === '1') {
    // Automated smoke test: load, wait, quit cleanly
    mainWindow.webContents.on('did-finish-load', () => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
      setTimeout(() => app.quit(), 5000);
    });
  }

  mainWindow.loadURL(SITE_URL).catch(() => {
    mainWindow.loadURL(OFFLINE_PAGE).catch(() => {});
  });

  // Save size/position when the user leaves
  ['resize', 'move', 'close'].forEach((e) => mainWindow.on(e, () => saveWindowState(mainWindow)));

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
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
