export type AuthSession = {
  token: string;
  expiresAt: number;
  tokenTtlSeconds: number;
  username: string;
};

const DEFAULT_API_BASE = "http://localhost:8080";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE;

export function getApiBaseUrl() {
  return apiBaseUrl.replace(/\/$/, "");
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type ApiEnvelope<T> = { ok: true } & T;
type ApiErrorEnvelope = { ok: false; error: { code: string; message: string; details?: Record<string, unknown> } };

type ApiResponse<T> = ApiEnvelope<T> | ApiErrorEnvelope;

function buildBase64Url(payload: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  let binary = "";
  data.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function buildCredentialsToken(username: string, password: string) {
  return buildBase64Url(JSON.stringify({ username, password }));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  const data = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!data || !data.ok || !response.ok) {
    const errorBody = data && !data.ok ? data.error : undefined;
    const code = errorBody?.code || "api.error";
    const message = errorBody?.message || response.statusText || "Unknown API error";
    throw new ApiError(message, code, response.status, errorBody?.details);
  }

  return data as ApiEnvelope<T>;
}

export async function registerUser(username: string, password: string) {
  return request<{ username: string; registered: boolean }>("/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function loginUser(username: string, password: string): Promise<AuthSession> {
  const payload = await request<{ authenticated: boolean; token: string; expires_at: number; token_ttl_seconds: number }>(
    "/auth",
    {
      method: "POST",
      body: JSON.stringify({ credentials_token: buildCredentialsToken(username, password) }),
    },
  );

  return {
    token: payload.token,
    expiresAt: payload.expires_at,
    tokenTtlSeconds: payload.token_ttl_seconds,
    username,
  };
}

export function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function streamChessAutoUrl() {
  const base = getApiBaseUrl();
  return `${base}/run/chess?mode=auto`;
}
