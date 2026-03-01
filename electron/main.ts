import { app, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { readHistoryFile, readAllSessionLogs, watchForChanges } from './data-reader';
import { parseSessionLine, parseHistoryLine } from '../src/lib/parser';
import { aggregateUsage } from '../src/lib/aggregator';
import { fetchPlanUsage } from './plan-usage';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isExpanded = false;

const COMPACT_WIDTH = 360;
const COMPACT_HEIGHT = 320;
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
    transparent: false,
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
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Skip tray creation for now — focus on the main window
  // Tray requires a valid .ico or .png file on Windows
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

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'widget-settings.json');
}

function buildLocalUsageData() {
  const historyLines = readHistoryFile();
  const sessionLines = readAllSessionLogs();

  const records = [];
  for (const line of sessionLines) {
    const rec = parseSessionLine(line);
    if (rec) records.push(rec);
  }
  const infos = [];
  for (const line of historyLines) {
    const info = parseHistoryLine(line);
    if (info) infos.push(info);
  }

  console.log(`[main] Parsed ${records.length} records, ${infos.length} history entries`);
  return aggregateUsage(records, infos);
}

// Plan usage is fetched on its own timer, cached separately
let cachedPlanUsage: Awaited<ReturnType<typeof fetchPlanUsage>> = null;

async function refreshPlanUsage() {
  try {
    const usage = await fetchPlanUsage();
    if (usage) {
      cachedPlanUsage = usage;
      console.log(`[main] Plan usage updated: session=${usage.fiveHour?.utilization}%, week=${usage.sevenDay?.utilization}%`);
    }
  } catch (err) {
    console.error('[main] Failed to fetch plan usage:', err);
  }
  // Always keep cachedPlanUsage — never clear it on failure
}

function buildUsageData() {
  const localData = buildLocalUsageData();
  return { ...localData, planUsage: cachedPlanUsage };
}

function loadAndSendData() {
  const data = buildUsageData();
  mainWindow?.webContents.send('usage-data-update', data);
}

ipcMain.handle('get-usage-data', () => {
  return buildUsageData();
});

ipcMain.handle('get-settings', () => {
  try {
    const content = fs.readFileSync(getSettingsPath(), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
});

ipcMain.handle('save-settings', (_event, settings) => {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
});

app.whenReady().then(async () => {
  console.log('[main] App ready, fetching plan usage...');

  // Fetch plan usage FIRST before creating window
  await refreshPlanUsage();

  console.log('[main] Creating window...');
  createWindow();
  console.log('[main] Window created');

  // Send data once the renderer is ready
  mainWindow?.webContents.on('did-finish-load', () => {
    console.log('[main] Renderer loaded, sending data...');
    loadAndSendData();
    console.log('[main] Data sent');
  });

  // Refresh plan usage every 60s on its own timer
  setInterval(async () => {
    await refreshPlanUsage();
    loadAndSendData(); // Push updated data to renderer
  }, 60_000);

  // Watch for local file changes with 2s debounce (no API call here)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  watchForChanges(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      loadAndSendData();
    }, 2000);
  });
  console.log('[main] Setup complete');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
