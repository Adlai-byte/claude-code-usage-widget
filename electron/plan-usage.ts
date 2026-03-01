import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import { PlanUsage } from '../src/types';

const CREDENTIALS_PATH = path.join(os.homedir(), '.claude', '.credentials.json');
const USAGE_API_URL = 'https://api.anthropic.com/api/oauth/usage';
const TOKEN_REFRESH_URL = 'https://console.anthropic.com/api/oauth/token';
const OAUTH_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';

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
    if (body) req.write(body);
    req.end();
  });
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number } | null> {
  try {
    const body = JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: OAUTH_CLIENT_ID,
    });

    const resp = await httpsRequest(TOKEN_REFRESH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, body);

    if (resp.statusCode !== 200) {
      console.error(`[plan-usage] Token refresh failed: ${resp.statusCode}`);
      return null;
    }

    const data = JSON.parse(resp.data);
    const accessToken = data.access_token;
    const expiresAt = Date.now() + (data.expires_in * 1000);

    // Update the credentials file with the new token
    try {
      const creds = readCredentials();
      if (creds?.claudeAiOauth) {
        creds.claudeAiOauth.accessToken = accessToken;
        creds.claudeAiOauth.expiresAt = expiresAt;
        fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2), 'utf-8');
        console.log('[plan-usage] Refreshed and saved new access token');
      }
    } catch {
      console.warn('[plan-usage] Could not save refreshed token to credentials file');
    }

    return { accessToken, expiresAt };
  } catch (err) {
    console.error('[plan-usage] Token refresh error:', err);
    return null;
  }
}

async function getValidAccessToken(): Promise<{ token: string; subscriptionType: string; rateLimitTier: string } | null> {
  const creds = readCredentials();
  if (!creds?.claudeAiOauth) {
    console.error('[plan-usage] No claudeAiOauth credentials found');
    return null;
  }

  const oauth = creds.claudeAiOauth;
  let token = oauth.accessToken;
  const subscriptionType = oauth.subscriptionType ?? 'unknown';
  const rateLimitTier = oauth.rateLimitTier ?? 'unknown';

  // Check if token is expired (with 5 min buffer)
  if (oauth.expiresAt && oauth.expiresAt < Date.now() + 300_000) {
    console.log('[plan-usage] Token expired or expiring soon, refreshing...');
    const refreshed = await refreshAccessToken(oauth.refreshToken);
    if (refreshed) {
      token = refreshed.accessToken;
    } else {
      console.warn('[plan-usage] Using potentially expired token');
    }
  }

  return { token, subscriptionType, rateLimitTier };
}

export async function fetchPlanUsage(): Promise<PlanUsage | null> {
  const auth = await getValidAccessToken();
  if (!auth) return null;

  try {
    const resp = await httpsRequest(USAGE_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'User-Agent': 'claude-code/2.0.32',
        'Authorization': `Bearer ${auth.token}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
    });

    if (resp.statusCode !== 200) {
      console.error(`[plan-usage] Usage API returned ${resp.statusCode}: ${resp.data.slice(0, 200)}`);
      return null;
    }

    const data = JSON.parse(resp.data);
    console.log('[plan-usage] Got usage data:', JSON.stringify(data));

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
