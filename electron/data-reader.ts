import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const HISTORY_FILE = path.join(CLAUDE_DIR, 'history.jsonl');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

interface FileEntry {
  path: string;
  size: number;
}

async function findRecentJsonlFiles(dir: string, cutoff: number): Promise<FileEntry[]> {
  const results: FileEntry[] = [];
  try {
    const entries = await fsp.readdir(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      try {
        const stat = await fsp.stat(fullPath);
        if (stat.isDirectory()) {
          results.push(...await findRecentJsonlFiles(fullPath, cutoff));
        } else if (entry.endsWith('.jsonl') && stat.mtimeMs >= cutoff) {
          if (stat.size <= MAX_FILE_SIZE) {
            results.push({ path: fullPath, size: stat.size });
          }
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
  const cutoff = Date.now() - MAX_AGE_MS;

  try {
    const files = await findRecentJsonlFiles(PROJECTS_DIR, cutoff);
    console.log(`[data-reader] Found ${files.length} recent JSONL files`);

    // Read files sequentially to keep memory low
    for (const file of files) {
      try {
        const content = await fsp.readFile(file.path, 'utf-8');
        const fileLines = content.split('\n');
        for (const line of fileLines) {
          if ((line.includes('"type":"assistant"') || line.includes('"type": "assistant"')) && line.includes('"usage"')) {
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
