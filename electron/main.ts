import { app, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain } from 'electron';
import path from 'path';

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

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
