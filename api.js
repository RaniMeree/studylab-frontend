import { supabase } from './supabaseClient';

// Set EXPO_PUBLIC_API_URL in your .env to point at the deployed backend.
// Falls back to localhost for local development.
export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function api(path, options = {}, { retries = 0, retryDelay = 3000 } = {}) {
  const headers = { ...(options.headers || {}) };
  // getSession() reads the cached session and transparently refreshes the JWT
  // when expired, so requests never go out with a stale token.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, retryDelay));
    try {
      const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${res.status})`);
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
      // Only retry on network errors (fetch threw), not on HTTP error responses
      if (e.message && e.message.includes('Request failed')) throw e;
    }
  }
  throw lastErr;
}

// Wake the backend early so Render has time to spin up before the user
// tries to play audio. Called once on app launch, failure is silent.
export function pingBackend() {
  fetch(`${API_BASE}/health`).catch(() => {});
}

export function postJson(path, body) {
  return api(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
