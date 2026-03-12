# UX Improvements & Notifications Design

**Date:** 2026-03-07
**Status:** Approved

## Goal

Enhance the Claude Usage Widget with system tray integration, desktop notifications for rate limits, always-on-top mode, resizable windows, and theme customization. Delivered incrementally in 3 phases.

## Phase 1 — System Tray + Notifications (highest impact)

### System Tray
- Minimize to system tray instead of taskbar
- Tray icon using existing `assets/icon.ico`
- Right-click context menu: Show/Hide Widget, Refresh Data, Quit
- Single-click tray icon: toggle widget visibility
- Close button (X) minimizes to tray instead of quitting

### Desktop Notifications (Electron `Notification` API)
Triggers:
- **Rate limit warning at 75%** — any tier (session, weekly, sonnet, opus)
- **Rate limit critical at 90%** — any tier
- **Token expired** — when `tokenStatus` changes to `'expired'`
- **Window reset** — when utilization drops significantly (tier resets)

Spam prevention:
- Cooldown per notification type per tier: no repeat within 10 minutes
- Only notify on threshold crossings (not every refresh cycle)
- Store last-notified state in memory (not persisted)

Settings additions:
- `notificationsEnabled: boolean` (default: true)
- `notifyAt75: boolean` (default: true)
- `notifyAt90: boolean` (default: true)
- `notifyOnExpired: boolean` (default: true)
- `notifyOnReset: boolean` (default: true)

### Settings Panel Updates
- New "Notifications" section with toggles for each notification type

## Phase 2 — Always-on-Top + Resize

### Always-on-Top
- Toggle via tray context menu and settings panel
- Persisted in settings: `alwaysOnTop: boolean` (default: false)
- Applied via `BrowserWindow.setAlwaysOnTop()`

### Resizable Window
- Enable resize on BrowserWindow
- Compact mode: min 280x180, max 500x400
- Expanded mode: min 400x500, max 1200x900
- Persist window bounds in settings: `windowBounds: { x, y, width, height }`
- Restore position/size on app launch
- Handle screen edge cases (window off-screen after monitor change)

### Tray Interaction
- Double-click tray icon: toggle compact/expanded mode

## Phase 3 — Theme Customization

### Themes
- Dark theme (current, default)
- Light theme (inverted palette)
- Theme toggle in settings and tray menu

### Accent Colors
- Preset palette: blue (default), green, purple, orange, red
- Applied to progress bars, headers, highlights

### Window Opacity
- Slider: 30% to 100% (default: 100%)
- Applied via `BrowserWindow.setOpacity()`
- Persisted in settings: `windowOpacity: number`

## Architecture Notes

- All new Electron-side logic in `electron/main.ts` (tray, window management)
- New file `electron/notifier.ts` for notification logic (keeps main.ts clean)
- Theme/accent state managed via existing `useSettings` hook
- CSS variables for theme colors, switched by a `data-theme` attribute on root
- No new dependencies required — Electron's built-in `Tray`, `Menu`, `Notification`, `nativeImage` APIs cover everything

## Out of Scope
- Custom notification sounds
- Notification history/log
- Multiple widget instances
- Taskbar badge/overlay icons
