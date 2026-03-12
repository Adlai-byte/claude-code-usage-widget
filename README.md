# Claude Code Usage Widget

A desktop widget for Windows that tracks and visualizes your [Claude Code](https://docs.anthropic.com/en/docs/claude-code) usage in real time. See your plan limits, token consumption, costs, and session activity at a glance.

![Electron](https://img.shields.io/badge/Electron-40-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white)

## Features

- **Plan Usage Limits** — Live session (5h window) and weekly utilization bars with reset countdowns
- **Token & Cost Tracking** — Current session, daily, weekly, and all-time token/cost summaries
- **Charts & Visualizations** — Daily token usage, session counts, model breakdown, project breakdown, and an activity heatmap
- **Compact & Expanded Views** — A small always-visible widget that expands into a full dashboard
- **Themes** — Dark, Light, and System modes with 6 accent colors (Indigo, Blue, Green, Purple, Orange, Red)
- **Window Opacity** — Adjustable transparency (30–100%)
- **Account Detection** — Automatically detects your logged-in Claude account and displays profile info
- **Account Switching** — Switch between Claude accounts directly from the widget
- **Auto-Refresh** — File watcher detects new session data; plan usage polls every 60 seconds

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) — must be installed and logged in at least once so that `~/.claude/.credentials.json` exists

## Installation

```bash
# Clone the repository
git clone https://github.com/Adlai-byte/claude-code-usage-widget.git
cd claude-code-usage-widget

# Install dependencies
npm install
```

## Usage

### Development

```bash
npm run dev
```

This starts the Vite dev server and launches Electron with hot reload.

### Preview (production build + run)

```bash
npm run preview
```

Builds the project and launches Electron using the production bundle — useful for testing before packaging.

### Build installer

```bash
npm run dist
```

Creates a Windows installer (NSIS) in the `release/` directory. The output `.exe` can be distributed and installed like any desktop app.

> **Note:** Code signing is disabled by default. If you get a "Cannot create symbolic link" error, either enable [Developer Mode](https://learn.microsoft.com/en-us/windows/apps/get-started/enable-your-device-for-development) in Windows Settings, or run your terminal as Administrator.

### Run tests

```bash
npm test
```

## Setup

1. **Install Claude Code** — Follow the [official docs](https://docs.anthropic.com/en/docs/claude-code) to install the CLI.

2. **Log in** — Run `claude` in your terminal and complete the login flow. This creates `~/.claude/.credentials.json` which the widget reads for API authentication.

3. **Launch the widget** — Run `npm run dev` (development) or `npm run preview` (production build).

4. **Use Claude Code normally** — The widget automatically reads session logs from `~/.claude/projects/` and displays your usage. New data appears within seconds.

### Settings

Click the **Settings** button (in expanded view) to configure:

| Setting | Description |
|---|---|
| **Theme** | Dark, Light, or System (follows OS preference) |
| **Accent Color** | Indigo, Blue, Green, Purple, Orange, or Red |
| **Window Opacity** | 30%–100% transparency |
| **Refresh Interval** | 30s, 1 min, 5 min, or Manual only |
| **Daily/Weekly Budget** | Token budget alerts (0 = no limit) |
| **Warning Threshold** | Alert at 50%, 75%, or 90% of budget |

### Switching Accounts

Open **Settings > Account > Switch Account**. This clears saved credentials and opens a terminal where you can run `claude` to log in with a different account.

## Project Structure

```
├── electron/           # Electron main process
│   ├── main.ts         # Window management, IPC handlers, data orchestration
│   ├── plan-usage.ts   # Claude API integration (usage + profile endpoints)
│   ├── data-reader.ts  # Async JSONL session log reader (30-day window)
│   └── preload.ts      # Secure IPC bridge (contextIsolation)
├── src/                # React renderer
│   ├── App.tsx         # Root component with theme/opacity management
│   ├── types.ts        # TypeScript interfaces and constants
│   ├── components/     # UI components
│   │   ├── CompactWidget.tsx   # Compact view with usage bars
│   │   ├── Dashboard.tsx       # Expanded view with charts
│   │   ├── SettingsPanel.tsx   # Settings UI
│   │   └── charts/             # Recharts visualizations
│   ├── hooks/          # React hooks (useUsageData, useSettings)
│   └── lib/            # Parser and aggregator logic
├── assets/             # App icon
└── package.json
```

## How It Works

1. **Session Logs** — Claude Code writes JSONL session logs to `~/.claude/projects/`. The widget reads files modified in the last 30 days and parses assistant message records containing token usage.

2. **Plan Usage API** — The widget uses your OAuth token from `~/.claude/.credentials.json` to call `api.anthropic.com` for real-time plan utilization (session and weekly limits).

3. **Live Updates** — A file watcher on the projects directory detects new session data and pushes updates to the renderer via IPC. Plan usage is polled every 60 seconds.

## License

ISC
