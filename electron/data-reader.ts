import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const HISTORY_FILE = path.join(CLAUDE_DIR, 'history.jsonl');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');

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
      let stat;
      try {
        stat = fs.statSync(dirPath);
      } catch {
        continue;
      }
      if (!stat.isDirectory()) continue;

      let files;
      try {
        files = fs.readdirSync(dirPath).filter(f => f.endsWith('.jsonl'));
      } catch {
        continue;
      }

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        try {
          // Only read files that we can handle — skip very large files
          // and only extract assistant records with usage data
          const fileStat = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, 'utf-8');
          const fileLines = content.split('\n');
          for (const line of fileLines) {
            // Quick pre-filter: only keep lines that contain "assistant" and "usage"
            if (line.includes('"type":"assistant"') && line.includes('"usage"')) {
              lines.push(line);
            }
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }
  } catch {
    // projects dir may not exist
  }
  console.log(`[data-reader] Read ${lines.length} assistant records from session logs`);
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
