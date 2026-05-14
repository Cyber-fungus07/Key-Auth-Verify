// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Change this to match wherever your FastAPI server runs
export const BASE_URL = "http://localhost:8000";

// ─── TOKEN STORAGE ────────────────────────────────────────────────────────────
export const tokenStore = {
  get:   ()  => localStorage.getItem("ka_token"),
  set:   (t) => localStorage.setItem("ka_token", t),
  clear: ()  => localStorage.removeItem("ka_token"),
};

// ─── HTTP HELPER ──────────────────────────────────────────────────────────────
async function request(endpoint, body, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    let data = {};
    try {
      data = await res.json();
    } catch (jsonErr) {
      console.error("Response is not JSON:", res.statusText);
    }

    if (!res.ok) {
      const errorMsg = data.message || data.error || data.detail || `Request failed (${res.status})`;
      throw new Error(errorMsg);
    }
    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

// ─── KEYSTROKE PAYLOAD BUILDER ────────────────────────────────────────────────
// Converts raw capture events → your TypingWord schema.
// Backend expects: logs = [{ word, data: [{ key, keydown, keyup, holdTime }] }]
export function buildLogsPayload(rounds) {
  // rounds: [{ word: string, events: [{ key, pressTime, releaseTime }] }]
  return rounds.map(({ word, events }) => {
    if (!events || events.length === 0) {
      throw new Error(`Word "${word}" has no keystroke events`);
    }
    return {
      word,
      data: events.map((e) => {
        const holdTime = e.releaseTime - e.pressTime;
        if (holdTime < 0) {
          console.warn(`Negative hold time for key "${e.key}": ${holdTime}ms`);
        }
        return {
          key:      e.key,
          keydown:  e.pressTime,
          keyup:    e.releaseTime ?? undefined,
          holdTime: Math.max(0, holdTime),
        };
      }),
    };
  });
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
// POST /api/auth/register  →  { username, email, password }
// Returns: { message, token, user: { id, username, email } }
export async function register(username, email, password) {
  const data = await request("/api/auth/register", { username, email, password });
  tokenStore.set(data.token);
  return data;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// POST /api/auth/login  →  { username, password }
// Returns: { message, token, user: { id, username, email } }
export async function login(username, password) {
  const data = await request("/api/auth/login", { username, password });
  tokenStore.set(data.token);
  return data;
}

// ─── SUBMIT TYPING DATA ───────────────────────────────────────────────────────
// POST /api/protected/typing/submit  →  { logs }  (requires Bearer token)
// Returns: { message, savedWords: number }
// Call this AFTER login/register with the collected typing rounds.
export async function submitTypingData(rounds) {
  const token = tokenStore.get();
  if (!token) throw new Error("Not authenticated — please log in first");
  const logs = buildLogsPayload(rounds);
  return request("/api/protected/typing/submit", { logs }, token);
}
