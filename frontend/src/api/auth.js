export const BASE_URL = "http://localhost:5001";

export const tokenStore = {
  get:   ()  => localStorage.getItem("ka_token"),
  set:   (t) => localStorage.setItem("ka_token", t),
  clear: ()  => localStorage.removeItem("ka_token"),
};

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
    try { data = await res.json(); } catch (e) {}

    if (!res.ok) {
      throw new Error(data.message || data.error || data.detail || `Request failed (${res.status})`);
    }
    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

export function buildLogsPayload(rounds) {
  return rounds.map(({ word, events }) => {
    if (!events?.length) throw new Error(`Word "${word}" has no keystroke events`);
    return {
      word,
      data: events.map((e) => ({
        key:      e.key,
        keydown:  e.pressTime,
        keyup:    e.releaseTime ?? undefined,
        holdTime: Math.max(0, e.releaseTime - e.pressTime),
      })),
    };
  });
}

export async function register(username, email, password) {
  const data = await request("/api/auth/register", { username, email, password });
  tokenStore.set(data.token);
  return data;
}

export async function login(username, password) {
  const data = await request("/api/auth/login", { username, password });
  tokenStore.set(data.token);
  return data;
}

export async function submitTypingData(rounds, isEnrollment = false) {
  const token = tokenStore.get();
  if (!token) throw new Error("Not authenticated");
  const logs = buildLogsPayload(rounds);
  return request("/api/protected/typing/submit", { logs, isEnrollment }, token);
}
