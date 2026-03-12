import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import { PlanUsage } from '../src/types';

// Read version at module load time (resolves relative to project root, not compiled output)
const APP_VERSION = (() => {
  try {
    const pkgPath = path.join(__dirname, '../../package.json');
    return JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version;
  } catch {
    return '1.0.0';
  }
})();

const CREDENTIALS_PATH = path.join(os.homedir(), '.claude', '.credentials.json');
const USAGE_API_URL = 'https://api.anthropic.com/api/oauth/usage';

interface Credentials {
  claudeAiOauth?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scopes: string[];
    subscriptionType?: string;
    rateLimitTier?: string;
  };
}

function readCredentials(): Credentials | null {
  try {
    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    console.error('[plan-usage] Could not read credentials file');
    return null;
  }
}

function httpsRequest(url: string, options: https.RequestOptions, body?: string): Promise<{ statusCode: number; data: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, data }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error('Request timed out after 15s'));
    });
    if (body) req.write(body);
    req.end();
  });
}

// Track token status for UI feedback
let tokenStatus: 'ok' | 'expired' | 'missing' = 'missing';

// Fix #4: Return type matches the string union, not widened to `string`
export function getTokenStatus(): 'ok' | 'expired' | 'missing' { return tokenStatus; }

function getAccessToken(): { token: string; subscriptionType: string; rateLimitTier: string } | null {
  // Always re-read credentials file — Claude Code refreshes it when the user runs `claude`
  const creds = readCredentials();
  if (!creds?.claudeAiOauth) {
    console.error('[plan-usage] No claudeAiOauth credentials found');
    tokenStatus = 'missing';
    return null;
  }

  const oauth = creds.claudeAiOauth;
  const subscriptionType = oauth.subscriptionType ?? 'unknown';
  const rateLimitTier = oauth.rateLimitTier ?? 'unknown';

  // Check if token is expired
  if (oauth.expiresAt && oauth.expiresAt < Date.now()) {
    console.warn('[plan-usage] Token expired. User needs to run `claude` to refresh.');
    tokenStatus = 'expired';
    // Still return it — the API will tell us if it's truly rejected
  } else {
    tokenStatus = 'ok';
  }

  return { token: oauth.accessToken, subscriptionType, rateLimitTier };
}

// Watch credentials file for changes (Claude Code refreshes the token)
let credentialsWatcher: fs.FSWatcher | null = null;

export function watchCredentials(callback: () => void): void {
  try {
    if (credentialsWatcher) credentialsWatcher.close();
    credentialsWatcher = fs.watch(CREDENTIALS_PATH, { persistent: false }, () => {
      console.log('[plan-usage] Credentials file changed, will re-fetch usage');
      callback();
    });
  } catch {
    // File may not exist yet
  }
}

// Fix #6: Export close function for cleanup on app quit
export function closeCredentialsWatcher(): void {
  if (credentialsWatcher) {
    try { credentialsWatcher.close(); } catch { /* ignore */ }
    credentialsWatcher = null;
  }
}

export async function fetchPlanUsage(): Promise<PlanUsage | null> {
  const auth = getAccessToken();
  if (!auth) return null;

  try {
    const resp = await httpsRequest(USAGE_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'User-Agent': `claude-usage-widget/${APP_VERSION}`,
        'Authorization': `Bearer ${auth.token}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
    });

    if (resp.statusCode === 401 || resp.statusCode === 403) {
      console.error(`[plan-usage] Auth failed (${resp.statusCode}). Token expired — run \`claude\` to refresh.`);
      tokenStatus = 'expired';
      return null;
    }

    if (resp.statusCode !== 200) {
      console.error(`[plan-usage] Usage API returned ${resp.statusCode}: ${resp.data.slice(0, 200)}`);
      return null;
    }

    tokenStatus = 'ok';
    const data = JSON.parse(resp.data);
    console.log('[plan-usage] Got usage data (keys:', Object.keys(data).join(', ') + ')');

    return {
      fiveHour: data.five_hour ? {
        utilization: data.five_hour.utilization ?? 0,
        resetsAt: data.five_hour.resets_at ?? null,
      } : null,
      sevenDay: data.seven_day ? {
        utilization: data.seven_day.utilization ?? 0,
        resetsAt: data.seven_day.resets_at ?? null,
      } : null,
      sevenDayOpus: data.seven_day_opus ? {
        utilization: data.seven_day_opus.utilization ?? 0,
        resetsAt: data.seven_day_opus.resets_at ?? null,
      } : null,
      sevenDaySonnet: data.seven_day_sonnet ? {
        utilization: data.seven_day_sonnet.utilization ?? 0,
        resetsAt: data.seven_day_sonnet.resets_at ?? null,
      } : null,
      subscriptionType: auth.subscriptionType,
      rateLimitTier: auth.rateLimitTier,
    };
  } catch (err) {
    console.error('[plan-usage] Failed to fetch usage:', err);
    return null;
  }
}
