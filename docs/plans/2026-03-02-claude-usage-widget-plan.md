# Claude Code Usage Widget — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Electron desktop widget that visualizes Claude Code usage from local `~/.claude/` data files — compact always-on-top mode with expand to full dashboard.

**Architecture:** Electron main process reads/watches JSONL files from `~/.claude/`, parses and aggregates usage data, sends it to the React renderer via IPC. Renderer has two modes: compact widget (300×180) and expanded dashboard (800×600). Data refreshes on configurable interval + file watch.

**Tech Stack:** Electron 34, React 19, Vite 6, TailwindCSS 4, Recharts 2, Vitest for testing

---

## Task 1: Scaffold Electron + React + Vite Project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `index.html`
- Create: `.gitignore`
- Create: `tailwind.config.js` (if needed by v4)

**Step 1: Initialize project and install dependencies**

Run:
```bash
cd "D:/Claude Code Usage Widget"
npm init -y
npm install react react-dom recharts
npm install -D electron vite @vitejs/plugin-react typescript \
  tailwindcss @tailwindcss/vite \
  @types/react @types/react-dom \
  vitest @testing-library/react @testing-library/jest-dom jsdom \
  electron-builder concurrently wait-on
```

**Step 2: Create `.gitignore`**

```gitignore
node_modules/
dist/
dist-electron/
release/
*.log
.vite/
```

**Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "electron"]
}
```

**Step 4: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist-electron"
  },
  "include": ["electron"]
}
```

**Step 5: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
```

**Step 6: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Claude Code Usage</title>
</head>
<body class="m-0 p-0 overflow-hidden">
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

**Step 7: Create `src/index.css`**

```css
@import "tailwindcss";

:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-card: #ffffff;
  --text-primary: #1a1a2e;
  --text-secondary: #6b7280;
  --border: #e5e7eb;
  --accent: #6366f1;
  --accent-light: #818cf8;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #0f0f14;
    --bg-secondary: #1a1a24;
    --bg-card: #1e1e2a;
    --text-primary: #e5e5e5;
    --text-secondary: #9ca3af;
    --border: #2d2d3a;
    --accent: #818cf8;
    --accent-light: #a5b4fc;
    --success: #34d399;
    --warning: #fbbf24;
    --danger: #f87171;
  }
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  -webkit-app-region: drag;
  user-select: none;
}

button, input, select, a {
  -webkit-app-region: no-drag;
}
```

**Step 8: Create `src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 9: Create `src/App.tsx`** (placeholder)

```tsx
export default function App() {
  return (
    <div className="p-4" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <h1 className="text-lg font-semibold">Claude Code Usage</h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
    </div>
  );
}
```

**Step 10: Create `electron/main.ts`**

```ts
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

// IPC: Toggle expanded/compact
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
```

**Step 11: Create `electron/preload.ts`**

```ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  toggleExpand: () => ipcRenderer.invoke('toggle-expand'),
  getExpanded: () => ipcRenderer.invoke('get-expanded'),
  getUsageData: () => ipcRenderer.invoke('get-usage-data'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  onDataUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('usage-data-update', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('usage-data-update');
  },
});
```

**Step 12: Update `package.json` scripts**

Replace the `package.json` scripts and main field:

```json
{
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && tsc -p tsconfig.node.json && electron .\"",
    "build": "tsc -p tsconfig.node.json && vite build",
    "preview": "npm run build && electron .",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Step 13: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

**Step 14: Create `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

**Step 15: Verify the project builds**

Run:
```bash
npx tsc -p tsconfig.node.json --noEmit
npx vite build
```
Expected: Build succeeds without errors.

**Step 16: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Electron + React + Vite + Tailwind project"
```

---

## Task 2: Data Types and Parser

**Files:**
- Create: `src/types.ts`
- Create: `src/lib/parser.ts`
- Create: `src/lib/__tests__/parser.test.ts`

**Step 1: Create `src/types.ts`**

```ts
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface SessionRecord {
  sessionId: string;
  timestamp: number;
  model: string;
  usage: TokenUsage;
}

export interface SessionInfo {
  sessionId: string;
  project: string;
  timestamp: number;
}

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  estimatedCost: number;
  sessions: number;
}

export interface ProjectUsage {
  project: string;
  displayName: string;
  totalTokens: number;
  estimatedCost: number;
  sessions: number;
}

export interface HeatmapCell {
  day: number;  // 0-6 (Sun-Sat)
  hour: number; // 0-23
  count: number;
}

export interface ModelUsage {
  model: string;
  displayName: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export interface UsageData {
  totalTokens: number;
  totalCost: number;
  totalSessions: number;
  todayTokens: number;
  todayCost: number;
  todaySessions: number;
  dailyUsage: DailyUsage[];
  projectUsage: ProjectUsage[];
  heatmap: HeatmapCell[];
  modelUsage: ModelUsage[];
  lastUpdated: number;
}

export interface AppSettings {
  refreshInterval: number; // ms: 30000, 60000, 300000, or 0 for manual
  dailyBudget: number;     // token limit per day, 0 = no limit
  monthlyBudget: number;   // token limit per month, 0 = no limit
  alertThreshold: number;  // 0.75 = warn at 75%
}

export const DEFAULT_SETTINGS: AppSettings = {
  refreshInterval: 60000,
  dailyBudget: 0,
  monthlyBudget: 0,
  alertThreshold: 0.75,
};

// Cost per token (not per 1M)
export const MODEL_PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  'claude-opus-4-6': { input: 15 / 1e6, output: 75 / 1e6, cacheWrite: 18.75 / 1e6, cacheRead: 1.5 / 1e6 },
  'claude-opus-4-20250514': { input: 15 / 1e6, output: 75 / 1e6, cacheWrite: 18.75 / 1e6, cacheRead: 1.5 / 1e6 },
  'claude-sonnet-4-6': { input: 3 / 1e6, output: 15 / 1e6, cacheWrite: 3.75 / 1e6, cacheRead: 0.3 / 1e6 },
  'claude-sonnet-4-20250514': { input: 3 / 1e6, output: 15 / 1e6, cacheWrite: 3.75 / 1e6, cacheRead: 0.3 / 1e6 },
  'claude-3-5-haiku-20241022': { input: 0.8 / 1e6, output: 4 / 1e6, cacheWrite: 1.0 / 1e6, cacheRead: 0.08 / 1e6 },
};

// Fallback for unknown models
export const DEFAULT_PRICING = { input: 3 / 1e6, output: 15 / 1e6, cacheWrite: 3.75 / 1e6, cacheRead: 0.3 / 1e6 };
```

**Step 2: Write parser tests — `src/lib/__tests__/parser.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { parseSessionLine, parseHistoryLine, calculateCost } from '../parser';

describe('parseSessionLine', () => {
  it('extracts usage from an assistant record', () => {
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 'abc-123',
      timestamp: '2026-03-01T10:00:00.000Z',
      message: { model: 'claude-opus-4-6' },
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 200,
        cache_read_input_tokens: 300,
      },
    });

    const result = parseSessionLine(line);
    expect(result).not.toBeNull();
    expect(result!.sessionId).toBe('abc-123');
    expect(result!.model).toBe('claude-opus-4-6');
    expect(result!.usage.inputTokens).toBe(100);
    expect(result!.usage.outputTokens).toBe(50);
    expect(result!.usage.cacheCreationTokens).toBe(200);
    expect(result!.usage.cacheReadTokens).toBe(300);
  });

  it('returns null for non-assistant records', () => {
    const line = JSON.stringify({ type: 'user', content: 'hello' });
    expect(parseSessionLine(line)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseSessionLine('not json')).toBeNull();
  });

  it('handles missing usage fields with defaults of 0', () => {
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 'abc',
      timestamp: '2026-03-01T10:00:00.000Z',
      message: { model: 'claude-opus-4-6' },
      usage: { input_tokens: 10, output_tokens: 5 },
    });
    const result = parseSessionLine(line);
    expect(result!.usage.cacheCreationTokens).toBe(0);
    expect(result!.usage.cacheReadTokens).toBe(0);
  });
});

describe('parseHistoryLine', () => {
  it('extracts session info from history entry', () => {
    const line = JSON.stringify({
      project: 'D:\\MyProject',
      sessionId: 'abc-123',
      timestamp: 1709290800000,
    });
    const result = parseHistoryLine(line);
    expect(result).not.toBeNull();
    expect(result!.project).toBe('D:\\MyProject');
    expect(result!.sessionId).toBe('abc-123');
  });

  it('returns null for lines without sessionId', () => {
    const line = JSON.stringify({ display: 'hello' });
    expect(parseHistoryLine(line)).toBeNull();
  });
});

describe('calculateCost', () => {
  it('calculates cost for known model', () => {
    const cost = calculateCost('claude-opus-4-6', {
      inputTokens: 1000000,
      outputTokens: 1000000,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    });
    // 1M input @ $15 + 1M output @ $75 = $90
    expect(cost).toBeCloseTo(90, 1);
  });

  it('uses default pricing for unknown model', () => {
    const cost = calculateCost('unknown-model', {
      inputTokens: 1000000,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    });
    // 1M input @ $3 (default = sonnet pricing)
    expect(cost).toBeCloseTo(3, 1);
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `npx vitest run`
Expected: FAIL — module `../parser` does not exist.

**Step 4: Implement `src/lib/parser.ts`**

```ts
import { SessionRecord, SessionInfo, TokenUsage, MODEL_PRICING, DEFAULT_PRICING } from '../types';

export function parseSessionLine(line: string): SessionRecord | null {
  try {
    const data = JSON.parse(line);
    if (data.type !== 'assistant' || !data.usage) return null;

    const usage: TokenUsage = {
      inputTokens: data.usage.input_tokens ?? 0,
      outputTokens: data.usage.output_tokens ?? 0,
      cacheCreationTokens: data.usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: data.usage.cache_read_input_tokens ?? 0,
    };

    return {
      sessionId: data.sessionId ?? '',
      timestamp: new Date(data.timestamp).getTime(),
      model: data.message?.model ?? 'unknown',
      usage,
    };
  } catch {
    return null;
  }
}

export function parseHistoryLine(line: string): SessionInfo | null {
  try {
    const data = JSON.parse(line);
    if (!data.sessionId) return null;

    return {
      sessionId: data.sessionId,
      project: data.project ?? 'Unknown',
      timestamp: data.timestamp ?? 0,
    };
  } catch {
    return null;
  }
}

export function calculateCost(model: string, usage: TokenUsage): number {
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;
  return (
    usage.inputTokens * pricing.input +
    usage.outputTokens * pricing.output +
    usage.cacheCreationTokens * pricing.cacheWrite +
    usage.cacheReadTokens * pricing.cacheRead
  );
}
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run`
Expected: All 6 tests PASS.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add data types and JSONL parser with tests"
```

---

## Task 3: Data Aggregation Engine

**Files:**
- Create: `src/lib/aggregator.ts`
- Create: `src/lib/__tests__/aggregator.test.ts`

**Step 1: Write aggregator tests — `src/lib/__tests__/aggregator.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { aggregateUsage } from '../aggregator';
import { SessionRecord, SessionInfo } from '../../types';

const makeRecord = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  sessionId: 'sess-1',
  timestamp: new Date('2026-03-01T10:00:00Z').getTime(),
  model: 'claude-opus-4-6',
  usage: { inputTokens: 100, outputTokens: 50, cacheCreationTokens: 0, cacheReadTokens: 0 },
  ...overrides,
});

const makeInfo = (overrides: Partial<SessionInfo> = {}): SessionInfo => ({
  sessionId: 'sess-1',
  project: 'D:\\MyProject',
  timestamp: new Date('2026-03-01T10:00:00Z').getTime(),
  ...overrides,
});

describe('aggregateUsage', () => {
  it('computes daily totals', () => {
    const records = [
      makeRecord(),
      makeRecord({ usage: { inputTokens: 200, outputTokens: 100, cacheCreationTokens: 0, cacheReadTokens: 0 } }),
    ];
    const infos = [makeInfo()];

    const result = aggregateUsage(records, infos);
    const day = result.dailyUsage.find(d => d.date === '2026-03-01');
    expect(day).toBeDefined();
    expect(day!.inputTokens).toBe(300);
    expect(day!.outputTokens).toBe(150);
  });

  it('computes project totals', () => {
    const records = [makeRecord()];
    const infos = [makeInfo()];

    const result = aggregateUsage(records, infos);
    expect(result.projectUsage.length).toBeGreaterThan(0);
    expect(result.projectUsage[0].displayName).toBe('MyProject');
  });

  it('computes model breakdown', () => {
    const records = [
      makeRecord({ model: 'claude-opus-4-6' }),
      makeRecord({ model: 'claude-sonnet-4-6', usage: { inputTokens: 50, outputTokens: 25, cacheCreationTokens: 0, cacheReadTokens: 0 } }),
    ];
    const result = aggregateUsage(records, [makeInfo()]);
    expect(result.modelUsage.length).toBe(2);
  });

  it('builds activity heatmap', () => {
    const records = [makeRecord()];
    const result = aggregateUsage(records, [makeInfo()]);
    // 10:00 UTC on Saturday March 1 2026
    const cell = result.heatmap.find(h => h.hour === 10);
    expect(cell).toBeDefined();
    expect(cell!.count).toBeGreaterThan(0);
  });

  it('returns zero totals for empty input', () => {
    const result = aggregateUsage([], []);
    expect(result.totalTokens).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.totalSessions).toBe(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run`
Expected: FAIL — `../aggregator` does not exist.

**Step 3: Implement `src/lib/aggregator.ts`**

```ts
import { SessionRecord, SessionInfo, UsageData, DailyUsage, ProjectUsage, HeatmapCell, ModelUsage } from '../types';
import { calculateCost } from './parser';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toISOString().slice(0, 10);
}

function extractDisplayName(project: string): string {
  // "D:\\AGENTIC APPROACH PROJECT\\Mikasa-V3" -> "Mikasa-V3"
  const parts = project.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || project;
}

function getToday(): string {
  return formatDate(Date.now());
}

export function aggregateUsage(records: SessionRecord[], infos: SessionInfo[]): UsageData {
  const today = getToday();

  // Build session -> project map
  const sessionProjectMap = new Map<string, string>();
  for (const info of infos) {
    if (!sessionProjectMap.has(info.sessionId)) {
      sessionProjectMap.set(info.sessionId, info.project);
    }
  }

  // Daily aggregation
  const dailyMap = new Map<string, DailyUsage>();
  // Project aggregation
  const projectMap = new Map<string, ProjectUsage>();
  // Model aggregation
  const modelMap = new Map<string, ModelUsage>();
  // Heatmap
  const heatmapMap = new Map<string, HeatmapCell>();
  // Unique sessions per day
  const dailySessions = new Map<string, Set<string>>();
  // All unique sessions
  const allSessions = new Set<string>();

  let totalTokens = 0;
  let totalCost = 0;
  let todayTokens = 0;
  let todayCost = 0;
  const todaySessions = new Set<string>();

  for (const rec of records) {
    const date = formatDate(rec.timestamp);
    const tokens = rec.usage.inputTokens + rec.usage.outputTokens + rec.usage.cacheCreationTokens + rec.usage.cacheReadTokens;
    const cost = calculateCost(rec.model, rec.usage);

    totalTokens += tokens;
    totalCost += cost;
    allSessions.add(rec.sessionId);

    if (date === today) {
      todayTokens += tokens;
      todayCost += cost;
      todaySessions.add(rec.sessionId);
    }

    // Daily
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { date, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, estimatedCost: 0, sessions: 0 });
    }
    const daily = dailyMap.get(date)!;
    daily.inputTokens += rec.usage.inputTokens;
    daily.outputTokens += rec.usage.outputTokens;
    daily.cacheCreationTokens += rec.usage.cacheCreationTokens;
    daily.cacheReadTokens += rec.usage.cacheReadTokens;
    daily.estimatedCost += cost;

    if (!dailySessions.has(date)) dailySessions.set(date, new Set());
    dailySessions.get(date)!.add(rec.sessionId);

    // Project
    const project = sessionProjectMap.get(rec.sessionId) ?? 'Unknown';
    if (!projectMap.has(project)) {
      projectMap.set(project, { project, displayName: extractDisplayName(project), totalTokens: 0, estimatedCost: 0, sessions: 0 });
    }
    const proj = projectMap.get(project)!;
    proj.totalTokens += tokens;
    proj.estimatedCost += cost;

    // Model
    const modelKey = rec.model;
    if (!modelMap.has(modelKey)) {
      const displayName = modelKey.includes('opus') ? 'Opus' : modelKey.includes('sonnet') ? 'Sonnet' : modelKey.includes('haiku') ? 'Haiku' : modelKey;
      modelMap.set(modelKey, { model: modelKey, displayName, inputTokens: 0, outputTokens: 0, estimatedCost: 0 });
    }
    const modelEntry = modelMap.get(modelKey)!;
    modelEntry.inputTokens += rec.usage.inputTokens;
    modelEntry.outputTokens += rec.usage.outputTokens;
    modelEntry.estimatedCost += cost;

    // Heatmap
    const d = new Date(rec.timestamp);
    const day = d.getUTCDay();
    const hour = d.getUTCHours();
    const key = `${day}-${hour}`;
    if (!heatmapMap.has(key)) {
      heatmapMap.set(key, { day, hour, count: 0 });
    }
    heatmapMap.get(key)!.count++;
  }

  // Set session counts on daily
  for (const [date, sessions] of dailySessions) {
    const daily = dailyMap.get(date);
    if (daily) daily.sessions = sessions.size;
  }

  // Set session counts on projects
  const projectSessionSets = new Map<string, Set<string>>();
  for (const rec of records) {
    const project = sessionProjectMap.get(rec.sessionId) ?? 'Unknown';
    if (!projectSessionSets.has(project)) projectSessionSets.set(project, new Set());
    projectSessionSets.get(project)!.add(rec.sessionId);
  }
  for (const [project, sessions] of projectSessionSets) {
    const proj = projectMap.get(project);
    if (proj) proj.sessions = sessions.size;
  }

  const dailyUsage = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const projectUsage = Array.from(projectMap.values()).sort((a, b) => b.totalTokens - a.totalTokens);
  const heatmap = Array.from(heatmapMap.values());
  const modelUsage = Array.from(modelMap.values()).sort((a, b) => b.estimatedCost - a.estimatedCost);

  return {
    totalTokens,
    totalCost,
    totalSessions: allSessions.size,
    todayTokens,
    todayCost,
    todaySessions: todaySessions.size,
    dailyUsage,
    projectUsage,
    heatmap,
    modelUsage,
    lastUpdated: Date.now(),
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add usage data aggregation engine with tests"
```

---

## Task 4: Electron Main Process — File Reading & IPC

**Files:**
- Create: `electron/data-reader.ts`
- Modify: `electron/main.ts`

**Step 1: Create `electron/data-reader.ts`**

```ts
import fs from 'fs';
import path from 'path';
import os from 'os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const HISTORY_FILE = path.join(CLAUDE_DIR, 'history.jsonl');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');

export interface RawSessionRecord {
  type: string;
  sessionId: string;
  timestamp: string;
  message?: { model: string };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export interface RawHistoryEntry {
  project?: string;
  sessionId?: string;
  timestamp?: number;
}

function readJsonlFile(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').filter(line => line.trim().length > 0);
  } catch {
    return [];
  }
}

export function readHistoryFile(): string[] {
  return readJsonlFile(HISTORY_FILE);
}

export function readAllSessionLogs(): string[] {
  const lines: string[] = [];
  try {
    const projectDirs = fs.readdirSync(PROJECTS_DIR);
    for (const dir of projectDirs) {
      const dirPath = path.join(PROJECTS_DIR, dir);
      const stat = fs.statSync(dirPath);
      if (!stat.isDirectory()) continue;

      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.jsonl'));
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        lines.push(...readJsonlFile(filePath));
      }
    }
  } catch {
    // projects dir may not exist
  }
  return lines;
}

export function watchForChanges(callback: () => void): fs.FSWatcher[] {
  const watchers: fs.FSWatcher[] = [];

  try {
    const watcher = fs.watch(HISTORY_FILE, { persistent: false }, () => callback());
    watchers.push(watcher);
  } catch { /* file may not exist */ }

  try {
    const watcher = fs.watch(PROJECTS_DIR, { recursive: true, persistent: false }, () => callback());
    watchers.push(watcher);
  } catch { /* dir may not exist */ }

  return watchers;
}
```

**Step 2: Update `electron/main.ts` to wire up data reading + IPC**

Add these imports and handlers to the existing `electron/main.ts`:

```ts
// Add to top of electron/main.ts
import { readHistoryFile, readAllSessionLogs, watchForChanges } from './data-reader';

// -- Data loading (add before app.whenReady) --

function loadAndSendData() {
  const historyLines = readHistoryFile();
  const sessionLines = readAllSessionLogs();
  mainWindow?.webContents.send('usage-data-update', { historyLines, sessionLines });
}

// Add IPC handler after existing handlers
ipcMain.handle('get-usage-data', () => {
  const historyLines = readHistoryFile();
  const sessionLines = readAllSessionLogs();
  return { historyLines, sessionLines };
});

// Settings persistence
import fs from 'fs';

const SETTINGS_PATH = path.join(app.getPath('userData'), 'widget-settings.json');

ipcMain.handle('get-settings', () => {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {
    return null;
  }
});

ipcMain.handle('save-settings', (_event, settings) => {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  return true;
});

// In app.whenReady, after createWindow/createTray, add:
// File watching
let debounceTimer: NodeJS.Timeout | null = null;
watchForChanges(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => loadAndSendData(), 2000);
});

// Initial data load after window ready
mainWindow!.webContents.on('did-finish-load', () => loadAndSendData());
```

**Step 3: Verify the Electron main compiles**

Run: `npx tsc -p tsconfig.node.json --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add file reader and IPC data bridge in main process"
```

---

## Task 5: Compact Widget UI

**Files:**
- Create: `src/hooks/useUsageData.ts`
- Create: `src/hooks/useSettings.ts`
- Create: `src/components/CompactWidget.tsx`
- Create: `src/components/Sparkline.tsx`
- Modify: `src/App.tsx`

**Step 1: Create `src/hooks/useUsageData.ts`**

```tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { UsageData, DEFAULT_SETTINGS } from '../types';
import { parseSessionLine, parseHistoryLine } from '../lib/parser';
import { aggregateUsage } from '../lib/aggregator';

declare global {
  interface Window {
    electronAPI?: {
      getUsageData: () => Promise<{ historyLines: string[]; sessionLines: string[] }>;
      onDataUpdate: (cb: (data: { historyLines: string[]; sessionLines: string[] }) => void) => () => void;
      toggleExpand: () => Promise<boolean>;
      getExpanded: () => Promise<boolean>;
      getSettings: () => Promise<any>;
      saveSettings: (s: any) => Promise<boolean>;
    };
  }
}

const EMPTY_DATA: UsageData = {
  totalTokens: 0,
  totalCost: 0,
  totalSessions: 0,
  todayTokens: 0,
  todayCost: 0,
  todaySessions: 0,
  dailyUsage: [],
  projectUsage: [],
  heatmap: [],
  modelUsage: [],
  lastUpdated: 0,
};

function processRawData(raw: { historyLines: string[]; sessionLines: string[] }): UsageData {
  const records = raw.sessionLines.map(parseSessionLine).filter(Boolean) as any[];
  const infos = raw.historyLines.map(parseHistoryLine).filter(Boolean) as any[];
  return aggregateUsage(records, infos);
}

export function useUsageData(refreshInterval: number) {
  const [data, setData] = useState<UsageData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const raw = await window.electronAPI.getUsageData();
      setData(processRawData(raw));
    } catch (err) {
      console.error('Failed to load usage data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen for file-watcher pushes
    const cleanup = window.electronAPI?.onDataUpdate((raw) => {
      setData(processRawData(raw));
    });

    return () => cleanup?.();
  }, [loadData]);

  // Polling interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(loadData, refreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshInterval, loadData]);

  return { data, loading, refresh: loadData };
}
```

**Step 2: Create `src/hooks/useSettings.ts`**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    window.electronAPI?.getSettings().then((saved) => {
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...saved });
    });
  }, []);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    await window.electronAPI?.saveSettings(next);
  }, [settings]);

  return { settings, updateSettings };
}
```

**Step 3: Create `src/components/Sparkline.tsx`**

```tsx
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { DailyUsage } from '../types';

interface Props {
  data: DailyUsage[];
}

export default function Sparkline({ data }: Props) {
  const last7 = data.slice(-7);
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={last7}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="inputTokens"
          stroke="var(--accent)"
          strokeWidth={1.5}
          fill="url(#sparkGrad)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

**Step 4: Create `src/components/CompactWidget.tsx`**

```tsx
import Sparkline from './Sparkline';
import { UsageData, AppSettings } from '../types';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function formatCost(n: number): string {
  return '$' + n.toFixed(2);
}

function getBudgetStatus(current: number, budget: number, threshold: number): 'ok' | 'warn' | 'danger' {
  if (budget <= 0) return 'ok';
  const ratio = current / budget;
  if (ratio >= 0.9) return 'danger';
  if (ratio >= threshold) return 'warn';
  return 'ok';
}

interface Props {
  data: UsageData;
  settings: AppSettings;
  onExpand: () => void;
}

export default function CompactWidget({ data, settings, onExpand }: Props) {
  const budgetStatus = getBudgetStatus(data.todayTokens, settings.dailyBudget, settings.alertThreshold);

  return (
    <div
      onClick={onExpand}
      className="cursor-pointer h-full flex flex-col justify-between p-4 rounded-xl"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--text-secondary)' }}>
          Claude Code Usage
        </span>
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--success)' }}
          title="Monitoring active"
        />
      </div>

      {/* Stats row */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatTokens(data.todayTokens)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>tokens today</div>
        </div>
        <div className="text-right">
          <div
            className="text-lg font-semibold"
            style={{
              color: budgetStatus === 'danger' ? 'var(--danger)' : budgetStatus === 'warn' ? 'var(--warning)' : 'var(--accent)',
            }}
          >
            {formatCost(data.todayCost)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {data.todaySessions} session{data.todaySessions !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Budget bar */}
      {settings.dailyBudget > 0 && (
        <div className="mb-2">
          <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: Math.min(100, (data.todayTokens / settings.dailyBudget) * 100) + '%',
                background: budgetStatus === 'danger' ? 'var(--danger)' : budgetStatus === 'warn' ? 'var(--warning)' : 'var(--accent)',
              }}
            />
          </div>
        </div>
      )}

      {/* Sparkline */}
      <Sparkline data={data.dailyUsage} />
    </div>
  );
}
```

**Step 5: Update `src/App.tsx`**

```tsx
import { useState, useCallback } from 'react';
import { useUsageData } from './hooks/useUsageData';
import { useSettings } from './hooks/useSettings';
import CompactWidget from './components/CompactWidget';

export default function App() {
  const { settings, updateSettings } = useSettings();
  const { data, loading } = useUsageData(settings.refreshInterval);
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(async () => {
    const result = await window.electronAPI?.toggleExpand();
    setExpanded(result ?? false);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</span>
      </div>
    );
  }

  if (!expanded) {
    return <CompactWidget data={data} settings={settings} onExpand={handleToggle} />;
  }

  // Expanded view placeholder — built in Task 6
  return (
    <div className="h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
      <button onClick={handleToggle} className="text-sm mb-4 px-3 py-1 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
        Collapse
      </button>
      <h1 className="text-xl font-bold mb-2">Dashboard (Coming Next)</h1>
    </div>
  );
}
```

**Step 6: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add compact widget view with sparkline and budget indicator"
```

---

## Task 6: Expanded Dashboard UI

**Files:**
- Create: `src/components/Dashboard.tsx`
- Create: `src/components/charts/TokenChart.tsx`
- Create: `src/components/charts/SessionChart.tsx`
- Create: `src/components/charts/ProjectChart.tsx`
- Create: `src/components/charts/ModelBreakdown.tsx`
- Create: `src/components/charts/ActivityHeatmap.tsx`
- Create: `src/components/SettingsPanel.tsx`
- Modify: `src/App.tsx`

**Step 1: Create `src/components/charts/TokenChart.tsx`**

```tsx
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DailyUsage } from '../../types';

interface Props {
  data: DailyUsage[];
}

function formatK(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return v.toString();
}

export default function TokenChart({ data }: Props) {
  const last30 = data.slice(-30);
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Token Usage (30d)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={last30}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={d => d.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={formatK} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--text-primary)' }}
            formatter={(val: number, name: string) => [formatK(val), name]}
          />
          <Area type="monotone" dataKey="inputTokens" name="Input" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
          <Area type="monotone" dataKey="outputTokens" name="Output" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
          <Area type="monotone" dataKey="cacheReadTokens" name="Cache Read" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 2: Create `src/components/charts/SessionChart.tsx`**

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DailyUsage } from '../../types';

interface Props {
  data: DailyUsage[];
}

export default function SessionChart({ data }: Props) {
  const last30 = data.slice(-30);
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Sessions per Day (30d)</h3>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={last30}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={d => d.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} allowDecimals={false} />
          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
          <Bar dataKey="sessions" name="Sessions" fill="var(--accent)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 3: Create `src/components/charts/ProjectChart.tsx`**

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ProjectUsage } from '../../types';

interface Props {
  data: ProjectUsage[];
}

function formatK(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return v.toString();
}

export default function ProjectChart({ data }: Props) {
  const top10 = data.slice(0, 10);
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Top Projects by Tokens</h3>
      <ResponsiveContainer width="100%" height={Math.max(150, top10.length * 32)}>
        <BarChart data={top10} layout="vertical">
          <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={formatK} />
          <YAxis type="category" dataKey="displayName" tick={{ fontSize: 11, fill: 'var(--text-primary)' }} width={120} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
            formatter={(val: number) => [formatK(val), 'Tokens']}
          />
          <Bar dataKey="totalTokens" fill="var(--accent)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 4: Create `src/components/charts/ModelBreakdown.tsx`**

```tsx
import { ModelUsage } from '../../types';

interface Props {
  data: ModelUsage[];
}

export default function ModelBreakdown({ data }: Props) {
  const total = data.reduce((sum, m) => sum + m.estimatedCost, 0);

  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Cost by Model</h3>
      <div className="space-y-3">
        {data.map((m) => {
          const pct = total > 0 ? (m.estimatedCost / total) * 100 : 0;
          return (
            <div key={m.model}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: 'var(--text-primary)' }}>{m.displayName}</span>
                <span style={{ color: 'var(--text-secondary)' }}>${m.estimatedCost.toFixed(2)} ({pct.toFixed(0)}%)</span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full" style={{ width: pct + '%', background: 'var(--accent)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 5: Create `src/components/charts/ActivityHeatmap.tsx`**

```tsx
import { HeatmapCell } from '../../types';

interface Props {
  data: HeatmapCell[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ActivityHeatmap({ data }: Props) {
  const cellMap = new Map<string, number>();
  let maxCount = 1;
  for (const cell of data) {
    const key = `${cell.day}-${cell.hour}`;
    cellMap.set(key, cell.count);
    if (cell.count > maxCount) maxCount = cell.count;
  }

  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Activity Heatmap</h3>
      <div className="overflow-x-auto">
        <div className="flex gap-0.5">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 mr-1">
            {DAYS.map(d => (
              <div key={d} className="h-4 flex items-center text-[9px]" style={{ color: 'var(--text-secondary)' }}>{d}</div>
            ))}
          </div>
          {/* Hour columns */}
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="flex flex-col gap-0.5">
              {Array.from({ length: 7 }, (_, day) => {
                const count = cellMap.get(`${day}-${hour}`) ?? 0;
                const intensity = count / maxCount;
                return (
                  <div
                    key={day}
                    className="w-4 h-4 rounded-sm"
                    title={`${DAYS[day]} ${hour}:00 — ${count} messages`}
                    style={{
                      background: count === 0
                        ? 'var(--border)'
                        : `color-mix(in srgb, var(--accent) ${Math.round(intensity * 100)}%, var(--border))`,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        {/* Hour labels */}
        <div className="flex mt-1 ml-7">
          {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
            <div key={h} className="text-[9px]" style={{ color: 'var(--text-secondary)', width: `${(3 / 24) * 100}%` }}>
              {h}:00
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 6: Create `src/components/SettingsPanel.tsx`**

```tsx
import { AppSettings } from '../types';

interface Props {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onUpdate, onClose }: Props) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Settings</h3>
        <button onClick={onClose} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--text-secondary)' }}>Close</button>
      </div>

      <div className="space-y-4">
        {/* Refresh Interval */}
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Refresh Interval</label>
          <select
            value={settings.refreshInterval}
            onChange={e => onUpdate({ refreshInterval: Number(e.target.value) })}
            className="w-full text-sm rounded px-2 py-1.5"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
            <option value={0}>Manual only</option>
          </select>
        </div>

        {/* Daily Budget */}
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Daily Token Budget (0 = no limit)</label>
          <input
            type="number"
            value={settings.dailyBudget}
            onChange={e => onUpdate({ dailyBudget: Number(e.target.value) })}
            className="w-full text-sm rounded px-2 py-1.5"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            min={0}
            step={100000}
          />
        </div>

        {/* Monthly Budget */}
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Monthly Token Budget (0 = no limit)</label>
          <input
            type="number"
            value={settings.monthlyBudget}
            onChange={e => onUpdate({ monthlyBudget: Number(e.target.value) })}
            className="w-full text-sm rounded px-2 py-1.5"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            min={0}
            step={1000000}
          />
        </div>

        {/* Alert Threshold */}
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Warning Threshold</label>
          <select
            value={settings.alertThreshold}
            onChange={e => onUpdate({ alertThreshold: Number(e.target.value) })}
            className="w-full text-sm rounded px-2 py-1.5"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            <option value={0.5}>50%</option>
            <option value={0.75}>75%</option>
            <option value={0.9}>90%</option>
          </select>
        </div>
      </div>
    </div>
  );
}
```

**Step 7: Create `src/components/Dashboard.tsx`**

```tsx
import { useState } from 'react';
import { UsageData, AppSettings } from '../types';
import TokenChart from './charts/TokenChart';
import SessionChart from './charts/SessionChart';
import ProjectChart from './charts/ProjectChart';
import ModelBreakdown from './charts/ModelBreakdown';
import ActivityHeatmap from './charts/ActivityHeatmap';
import SettingsPanel from './SettingsPanel';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

interface Props {
  data: UsageData;
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  onCollapse: () => void;
  onRefresh: () => void;
}

export default function Dashboard({ data, settings, onUpdateSettings, onCollapse, onRefresh }: Props) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onCollapse}
            className="text-xs px-2 py-1 rounded hover:opacity-80"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            Compact
          </button>
          <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Claude Code Usage</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="text-xs px-2 py-1 rounded hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            Refresh
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs px-2 py-1 rounded hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Tokens', value: formatTokens(data.totalTokens) },
            { label: 'Total Cost', value: '$' + data.totalCost.toFixed(2) },
            { label: 'Sessions', value: data.totalSessions.toString() },
            { label: 'Projects', value: data.projectUsage.length.toString() },
          ].map(card => (
            <div key={card.label} className="rounded-lg p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{card.label}</div>
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Settings panel (conditional) */}
        {showSettings && (
          <SettingsPanel settings={settings} onUpdate={onUpdateSettings} onClose={() => setShowSettings(false)} />
        )}

        {/* Charts */}
        <TokenChart data={data.dailyUsage} />

        <div className="grid grid-cols-2 gap-3">
          <SessionChart data={data.dailyUsage} />
          <ModelBreakdown data={data.modelUsage} />
        </div>

        <ActivityHeatmap data={data.heatmap} />
        <ProjectChart data={data.projectUsage} />
      </div>
    </div>
  );
}
```

**Step 8: Update `src/App.tsx` to include Dashboard**

```tsx
import { useState, useCallback } from 'react';
import { useUsageData } from './hooks/useUsageData';
import { useSettings } from './hooks/useSettings';
import CompactWidget from './components/CompactWidget';
import Dashboard from './components/Dashboard';

export default function App() {
  const { settings, updateSettings } = useSettings();
  const { data, loading, refresh } = useUsageData(settings.refreshInterval);
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(async () => {
    const result = await window.electronAPI?.toggleExpand();
    setExpanded(result ?? false);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</span>
      </div>
    );
  }

  if (!expanded) {
    return <CompactWidget data={data} settings={settings} onExpand={handleToggle} />;
  }

  return (
    <Dashboard
      data={data}
      settings={settings}
      onUpdateSettings={updateSettings}
      onCollapse={handleToggle}
      onRefresh={refresh}
    />
  );
}
```

**Step 9: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

**Step 10: Commit**

```bash
git add -A
git commit -m "feat: add expanded dashboard with charts, heatmap, and settings"
```

---

## Task 7: App Icon and Final Polish

**Files:**
- Modify: `electron/main.ts` — add proper app icon, tray icon behavior
- Modify: `package.json` — add build configuration

**Step 1: Update `package.json` with electron-builder config**

Add to `package.json`:

```json
{
  "build": {
    "appId": "com.claude-usage-widget",
    "productName": "Claude Code Usage Widget",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "build/icon.png"
    }
  }
}
```

Add script:
```json
{
  "scripts": {
    "dist": "npm run build && electron-builder"
  }
}
```

**Step 2: Test the full app in dev mode**

Run: `npm run dev`
Expected: Electron window opens showing compact widget with real data from `~/.claude/`.

**Step 3: Click to expand and verify dashboard renders with real data**

Expected: Charts, heatmap, project list, model breakdown all display data.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add electron-builder config and final polish"
```

---

## Summary

| Task | Description | Est. Steps |
|------|-------------|------------|
| 1 | Scaffold Electron + React + Vite + Tailwind | 16 |
| 2 | Data types and JSONL parser with tests | 6 |
| 3 | Aggregation engine with tests | 5 |
| 4 | Main process file reading and IPC | 4 |
| 5 | Compact widget UI | 7 |
| 6 | Expanded dashboard UI | 10 |
| 7 | App icon and final polish | 4 |
