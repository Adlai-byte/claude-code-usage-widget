import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const HISTORY_FILE = path.join(CLAUDE_DIR, 'history.jsonl');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');

const MAX_FILE_SIZE = 100 * 1024 * 1024;

async function readJsonlFileAsync(filePath: string): Promise<string[]> {
  try {
    const content = await fsp.readFile(filePath, 'utf-8');
    return content.split('\n').filter(line => line.trim().length > 0);
  } catch {
    return [];
  }
}

export async function readHistoryFile(): Promise<string[]> {
  return readJsonlFileAsync(HISTORY_FILE);
}

async function findJsonlFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await fsp.readdir(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      try {
        const stat = await fsp.stat(fullPath);
        if (stat.isDirectory()) {
          results.push(...await findJsonlFiles(fullPath));
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

export async function readAllSessionLogs(): Promise<string[]> {
  const lines: string[] = [];
  try {
    const jsonlFiles = await findJsonlFiles(PROJECTS_DIR);

    // Read files in batches to avoid opening too many at once
    const BATCH_SIZE = 50;
    for (let i = 0; i < jsonlFiles.length; i += BATCH_SIZE) {
      const batch = jsonlFiles.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async (filePath) => {
        const filtered: string[] = [];
        try {
          const fileStat = await fsp.stat(filePath);
          if (fileStat.size > MAX_FILE_SIZE) {
            console.warn(`[data-reader] Skipping large file (${(fileStat.size / 1024 / 1024).toFixed(0)}MB): ${filePath}`);
            return filtered;
          }
          const content = await fsp.readFile(filePath, 'utf-8');
          const fileLines = content.split('\n');
          for (const line of fileLines) {
            if ((line.includes('"type":"assistant"') || line.includes('"type": "assistant"')) && line.includes('"usage"')) {
              filtered.push(line);
            }
          }
        } catch {
          // Skip files that can't be read
        }
        return filtered;
      }));
      for (const result of results) {
        lines.push(...result);
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
