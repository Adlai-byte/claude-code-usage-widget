import { app, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { readHistoryFile, readAllSessionLogs, watchForChanges } from './data-reader';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isExpanded = false;

const COMPACT_WIDTH = 320;
const COMPACT_HEIGHT = 200;
const EXPANDED_WIDTH = 820;
const EXPANDED_HEIGHT = 620;

function getWindowPosition() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const x = screenWidth - COMPACT_WIDTH - 20;
  const y = screenHeight - COMPACT_HEIGHT - 20;
  return { x, y };
}

function createWindow() {
  const { x, y } = getWindowPosition();

  mainWindow = new BrowserWindow({
    width: COMPACT_WIDTH,
    height: COMPACT_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Claude Code Usage');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow?.show() },
    { label: 'Quit', click: () => app.quit() },
  ]));
  tray.on('click', () => mainWindow?.show());
}

ipcMain.handle('toggle-expand', () => {
  if (!mainWindow) return;
  isExpanded = !isExpanded;

  if (isExpanded) {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setSize(EXPANDED_WIDTH, EXPANDED_HEIGHT);
    mainWindow.setPosition(
      Math.round((screenWidth - EXPANDED_WIDTH) / 2),
      Math.round((screenHeight - EXPANDED_HEIGHT) / 2)
    );
    mainWindow.setResizable(true);
  } else {
    const { x, y } = getWindowPosition();
    mainWindow.setSize(COMPACT_WIDTH, COMPACT_HEIGHT);
    mainWindow.setPosition(x, y);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setResizable(false);
  }

  return isExpanded;
});

ipcMain.handle('get-expanded', () => isExpanded);

const SETTINGS_PATH = path.join(app.getPath('userData'), 'widget-settings.json');

function loadAndSendData() {
  const historyLines = readHistoryFile();
  const sessionLines = readAllSessionLogs();
  mainWindow?.webContents.send('usage-data-update', { historyLines, sessionLines });
}

ipcMain.handle('get-usage-data', () => {
  const historyLines = readHistoryFile();
  const sessionLines = readAllSessionLogs();
  return { historyLines, sessionLines };
});

ipcMain.handle('get-settings', () => {
  try {
    const content = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
});

ipcMain.handle('save-settings', (_event, settings) => {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Send data once the renderer is ready
  mainWindow?.webContents.on('did-finish-load', () => {
    loadAndSendData();
  });

  // Watch for file changes with 2s debounce
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  watchForChanges(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      loadAndSendData();
    }, 2000);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
