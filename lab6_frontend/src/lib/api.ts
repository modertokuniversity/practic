const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const TOKEN_KEY = "timetracker-access-token";

export function saveAccessToken(token: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}

export function getAccessToken() {
  return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message ?? data.detail ?? `API request failed (${response.status})`);
  return data as T;
}

export async function signIn(email: string, password: string) {
  const result = await apiRequest<{ accessToken: string; user: { id: number; email: string; role: string } }>("/auth/login", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
  saveAccessToken(result.accessToken);
  return result.user;
}
