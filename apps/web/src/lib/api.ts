import type { Session } from "../types";

const API_ORIGIN = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
let accessToken = "";

export function apiOrigin(): string {
  return API_ORIGIN || window.location.origin;
}

export function getAccessToken(): string {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(", ");
    if (body.message) return body.message;
  } catch {
    // Ignore non-JSON errors.
  }
  return `HTTP ${response.status}`;
}

async function rawRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });

  if (response.status === 401 && retry && path !== "/api/auth/refresh") {
    const refreshed = await refreshSession().catch(() => null);
    if (refreshed) return rawRequest<T>(path, init, false);
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function api<T>(path: string, init?: RequestInit): Promise<T> {
  return rawRequest<T>(path, init);
}

export async function login(username: string, password: string): Promise<Session> {
  const session = await rawRequest<Session>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  }, false);
  setAccessToken(session.accessToken);
  return session;
}

export async function register(username: string, password: string): Promise<Session> {
  const session = await rawRequest<Session>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password })
  }, false);
  setAccessToken(session.accessToken);
  return session;
}

export async function refreshSession(): Promise<Session> {
  const session = await rawRequest<Session>("/api/auth/refresh", {
    method: "POST"
  }, false);
  setAccessToken(session.accessToken);
  return session;
}

export async function logout(): Promise<void> {
  try {
    await rawRequest<{ ok: boolean }>("/api/auth/logout", { method: "POST" }, false);
  } finally {
    setAccessToken("");
  }
}
