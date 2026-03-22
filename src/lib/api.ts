export type AuthSession = {
  token: string;
  expiresAt: number;
  tokenTtlSeconds: number;
  username: string;
};

const DEFAULT_API_BASE = "http://localhost:8080";
const rawBase = import.meta.env.VITE_API_BASE_URL?.trim();
/** Empty env falls back to direct backend URL. Set to `/api` when using Vite dev proxy. */
const apiBaseUrl = rawBase === "" || rawBase === undefined ? DEFAULT_API_BASE : rawBase;

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
  const data = (await response.clone().json().catch(() => null)) as ApiResponse<T> | null;

  if (!data || !data.ok || !response.ok) {
    throw await buildApiError(response, data);
  }

  return data as ApiEnvelope<T>;
}

async function buildApiError<T>(response: Response, data?: ApiResponse<T> | null): Promise<ApiError> {
  const parsed = data ?? ((await response.clone().json().catch(() => null)) as ApiResponse<T> | null);
  const errorBody = parsed && !parsed.ok ? parsed.error : undefined;
  const fallbackBody = (await response.clone().text().catch(() => "")).trim();
  const fallbackMessage = fallbackBody
    ? `Request failed (${response.status}): ${fallbackBody.slice(0, 180)}`
    : `Request failed (${response.status || "network"})`;
  const code = errorBody?.code || "api.error";
  const message = errorBody?.message || response.statusText || fallbackMessage;
  return new ApiError(message, code, response.status, errorBody?.details);
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

/**
 * Parse a failed JSON API response (same envelope as POST /auth) and throw ApiError.
 * Use after fetch when response.ok is false (including non-stream errors).
 */
export async function throwIfResponseNotOk(response: Response): Promise<void> {
  if (response.ok) return;
  throw await buildApiError(response);
}

export async function revokeAuthToken(token: string) {
  return request<{ revoked: boolean }>("/auth/token", {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function streamChessAutoUrl() {
  const base = getApiBaseUrl();
  return `${base}/run/chess?mode=auto`;
}

export function streamEvalPlusAutoUrl() {
  const base = getApiBaseUrl();
  return `${base}/run/evalplus?mode=auto`;
}
