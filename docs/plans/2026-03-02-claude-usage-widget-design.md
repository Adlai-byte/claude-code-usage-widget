# Claude Code Usage Widget — Design Document

## Overview
An Electron desktop widget for Windows that visualizes Claude Code usage data from local `~/.claude/` files. Compact always-on-top mode shows key stats; click to expand into a full dashboard.

## Tech Stack
- **Runtime:** Electron
- **Frontend:** React + Vite + TailwindCSS
- **Charts:** Recharts
- **Data:** Parse local JSONL files from `~/.claude/`

## Data Sources
- `~/.claude/history.jsonl` — prompt history with project, sessionId, timestamp
- `~/.claude/projects/<name>/*.jsonl` — session logs with token usage, model, message types

### Extracted Fields (from `type: "assistant"` records in session logs)
- `usage.input_tokens`, `usage.output_tokens`
- `usage.cache_creation_input_tokens`, `usage.cache_read_input_tokens`
- `message.model`
- `timestamp`, `sessionId`

### From history.jsonl
- `project`, `sessionId`, `timestamp` — maps sessions to projects

## Views

### Compact Widget (~300x180px, always-on-top)
- Today's total tokens (input + output)
- Estimated cost today
- Sessions today count
- Mini sparkline of last 7 days
- Click to expand

### Expanded Dashboard (~800x600px)

**Token Usage & Cost:**
- Area chart: daily input/output/cache tokens
- Running cost estimate
- Model breakdown (Opus/Sonnet/Haiku)

**Session Activity:**
- Total sessions and messages
- Activity heatmap (day × hour)
- Sessions per day bar chart

**Project Breakdown:**
- Horizontal bar chart: top projects by token usage
- Table with project name, sessions, tokens, est. cost

## Features

### Auto-Refresh
- Configurable interval: 30s, 1min, 5min, manual
- File watcher on history.jsonl for real-time updates
- Settings accessible via gear icon

### Usage Alerts
- Configurable daily/monthly token budget
- Visual progress bar: green → yellow (75%) → red (90%)
- Desktop notification at threshold

### Cost Calculation (per 1M tokens)
| Model | Input | Output | Cache Write | Cache Read |
|-------|-------|--------|-------------|------------|
| Opus 4 | $15 | $75 | $18.75 | $1.50 |
| Sonnet 4 | $3 | $15 | $3.75 | $0.30 |
| Haiku 3.5 | $0.80 | $4 | $1.00 | $0.08 |

## Window Behavior
- Frameless, rounded corners, draggable
- Always-on-top in compact mode
- Remembers position between launches
- Smooth expand/collapse animation
- System dark/light mode support
- Close to system tray

## Visual Style
- Minimal & clean
- Simple cards, clean typography, subtle borders
- Data-focused with minimal decoration
- Dark/light mode following system preference
