import { supabase } from './supabaseClient';

// Set EXPO_PUBLIC_API_URL in your .env to point at the deployed backend.
// Falls back to localhost for local development.
export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  // getSession() reads the cached session and transparently refreshes the JWT
  // when expired, so requests never go out with a stale token.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || 'Request failed');
  }
  return res.json();
}

export function postJson(path, body) {
  return api(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
