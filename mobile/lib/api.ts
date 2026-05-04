/**
 * Tiny typed fetch wrapper that:
 * - reads the API base URL from Expo's runtime config,
 * - auto-attaches the JWT,
 * - throws a structured error on non-2xx so screens can show messages.
 */

import Constants from "expo-constants";
import { getAuthToken } from "./storage";

function baseUrl(): string {
  const fromExtra =
    (Constants?.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  return fromExtra ?? "http://localhost:3000";
}

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export type FetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Skip the auth header (used for /api/auth/mobile-login). */
  noAuth?: boolean;
};

export async function api<T = unknown>(
  path: string,
  opts: FetchOptions = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${baseUrl()}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  if (!opts.noAuth) {
    const token = await getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (e) {
    throw new ApiError(0, "Network error", e);
  }

  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload && typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : null) || `Request failed (${res.status})`;
    throw new ApiError(res.status, message, payload);
  }

  return payload as T;
}
