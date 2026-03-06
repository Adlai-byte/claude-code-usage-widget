import fs from 'fs';
import path from 'path';
import os from 'os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const HISTORY_FILE = path.join(CLAUDE_DIR, 'history.jsonl');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');

// Fix #9: Skip files larger than 100MB to prevent OOM
const MAX_FILE_SIZE = 100 * 1024 * 1024;

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

// Fix #12: Recursively find all .jsonl files under a directory
function findJsonlFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...findJsonlFiles(fullPath));
        } else if (entry.endsWith('.jsonl')) {
          results.push(fullPath);
        }
      } catch {
        continue;
      }
    }
  } catch {
    // Directory may not be readable
  }
  return results;
}

export function readAllSessionLogs(): string[] {
  const lines: string[] = [];
  try {
    const jsonlFiles = findJsonlFiles(PROJECTS_DIR);

    for (const filePath of jsonlFiles) {
      try {
        // Fix #9: Skip very large files to prevent OOM
        const fileStat = fs.statSync(filePath);
        if (fileStat.size > MAX_FILE_SIZE) {
          console.warn(`[data-reader] Skipping large file (${(fileStat.size / 1024 / 1024).toFixed(0)}MB): ${filePath}`);
          continue;
        }
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
