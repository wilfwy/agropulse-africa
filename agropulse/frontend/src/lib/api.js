const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
export const TOKEN_KEY = "agropulse_token";

export async function getPrices(product = "MAIS") {
  const r = await fetch(`${API}/prices/current?product=${product}&country=TGO`, { cache: "no-store" });
  return r.json();
}

export function getToken() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t) {
  try { localStorage.setItem(TOKEN_KEY, t); } catch {}
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers, cache: "no-store" });
  if (res.status === 401) {
    clearToken();
    throw new Error("Session expirée — reconnectez-vous");
  }
  return res.json();
}

export async function register(phone, full_name) {
  const r = await fetch(`${API}/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, full_name }),
  });
  return r.json();
}

export async function login(phone, otp) {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp }),
  });
  return r.json();
}

export async function me() {
  const r = await fetch(`${API}/users/me`, {
    headers: { Authorization: `Bearer ${getToken()}` }, cache: "no-store",
  });
  return r.status === 200 ? r.json() : null;
}
