import { app, BrowserWindow, screen, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { readHistoryFile, readAllSessionLogs, watchForChanges } from './data-reader';
import { parseSessionLine, parseHistoryLine } from '../src/lib/parser';
import { aggregateUsage } from '../src/lib/aggregator';
import { fetchPlanUsage, fetchAccountInfo, getAccountInfo, watchCredentials, getTokenStatus, closeCredentialsWatcher } from './plan-usage';
import { exec } from 'child_process';

let mainWindow: BrowserWindow | null = null;
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

// Store watchers for cleanup on quit
let fileWatchers: fs.FSWatcher[] = [];

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

  // Register did-finish-load BEFORE loading the page
  mainWindow.webContents.on('did-finish-load', async () => {
    console.log('[main] Renderer loaded, sending data...');
    await loadAndSendData();
    console.log('[main] Data sent');
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

ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('close-window', () => {
  mainWindow?.close();
});

ipcMain.handle('set-opacity', (_event, opacity: number) => {
  const value = Math.max(0.3, Math.min(1, opacity / 100));
  mainWindow?.setOpacity(value);
});

ipcMain.handle('switch-account', async () => {
  // Delete credentials to force re-login
  const credPath = path.join(require('os').homedir(), '.claude', '.credentials.json');
  try {
    fs.unlinkSync(credPath);
  } catch { /* may not exist */ }
  // Open a terminal so user can run `claude` to log in
  if (process.platform === 'win32') {
    exec('start cmd /k "echo Run: claude && echo. && echo This will start the login flow. && echo."');
  }
  // Refresh data to show logged-out state
  await loadAndSendData();
});

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'widget-settings.json');
}

async function buildLocalUsageData() {
  const [historyLines, sessionLines] = await Promise.all([
    readHistoryFile(),
    readAllSessionLogs(),
  ]);

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
let refreshInFlight = false;

async function refreshPlanUsage() {
  // Fix #5: Guard against concurrent API calls
  if (refreshInFlight) return;
  refreshInFlight = true;
  try {
    const usage = await fetchPlanUsage();
    if (usage) {
      cachedPlanUsage = usage;
      console.log(`[main] Plan usage updated: session=${usage.fiveHour?.utilization}%, week=${usage.sevenDay?.utilization}%`);
    }
  } catch (err) {
    console.error('[main] Failed to fetch plan usage:', err);
  } finally {
    refreshInFlight = false;
  }
  // Always keep cachedPlanUsage — never clear it on failure
}

async function buildUsageData() {
  const localData = await buildLocalUsageData();
  return { ...localData, planUsage: cachedPlanUsage, tokenStatus: getTokenStatus(), accountInfo: getAccountInfo() };
}

let dataRefreshInFlight = false;

async function loadAndSendData() {
  if (dataRefreshInFlight) return;
  dataRefreshInFlight = true;
  try {
    const data = await buildUsageData();
    mainWindow?.webContents.send('usage-data-update', data);
  } catch (err) {
    console.error('[main] Failed to build usage data:', err);
  } finally {
    dataRefreshInFlight = false;
  }
}

ipcMain.handle('get-usage-data', async () => {
  return await buildUsageData();
});

ipcMain.handle('get-settings', () => {
  try {
    const content = fs.readFileSync(getSettingsPath(), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
});

// Fix #3: Return true so renderer gets a boolean as expected
ipcMain.handle('save-settings', (_event, settings) => {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
  return true;
});

app.whenReady().then(async () => {
  console.log('[main] App ready, fetching plan usage...');

  // Fetch plan usage and account info FIRST before creating window
  await Promise.all([refreshPlanUsage(), fetchAccountInfo()]);

  console.log('[main] Creating window...');
  createWindow();
  console.log('[main] Window created');

  // Refresh plan usage every 60s on its own timer
  const planTimer = setInterval(async () => {
    await refreshPlanUsage();
    loadAndSendData();
  }, 60_000);

  // Watch credentials file — when Claude Code refreshes the token, re-fetch with debounce
  let credDebounce: ReturnType<typeof setTimeout> | null = null;
  watchCredentials(() => {
    // Fix #10: Debounce credentials watcher (fs.watch fires multiple events per write on Windows)
    if (credDebounce) clearTimeout(credDebounce);
    credDebounce = setTimeout(async () => {
      await Promise.all([refreshPlanUsage(), fetchAccountInfo()]);
      loadAndSendData();
    }, 2000);
  });

  // Watch for local file changes with 2s debounce (no API call here)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  fileWatchers = watchForChanges(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      loadAndSendData();
    }, 2000);
  });
  console.log('[main] Setup complete');

  // Fix #6: Clean up watchers and timers on quit
  app.on('will-quit', () => {
    clearInterval(planTimer);
    for (const w of fileWatchers) {
      try { w.close(); } catch { /* ignore */ }
    }
    closeCredentialsWatcher();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
