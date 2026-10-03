import { getBaseUrl } from './config';

let _token: string | null = null;

export function setToken(t: string | null) { _token = t; }
export function getToken(): string | null { return _token; }

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
  timeoutMs?: number;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  { body, auth = true, timeoutMs = 15000, headers, ...rest }: RequestOptions = {},
): Promise<T> {
  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string>),
  };
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';
  if (auth && _token) finalHeaders.Authorization = `Bearer ${_token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${getBaseUrl()}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === 'AbortError') throw new ApiError('Request timed out', 0, null);
    throw new ApiError(e?.message || 'Network error', 0, null);
  }
  clearTimeout(timer);

  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }

  if (!res.ok) {
    const message =
      (json && typeof json === 'object' && 'error' in json && (json as any).error) ||
      `${res.status} ${res.statusText}`;
    throw new ApiError(String(message), res.status, json);
  }
  return json as T;
}
