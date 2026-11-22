import { useAuthStore } from '../stores/authStore';

// In production the web app and the API share one HTTPS origin, so the API URL
// is relative ("/api") and survives a change of hostname. Development uses the
// local server.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
// Uploaded files are served from the API host root, not under /api. This is
// always an absolute origin, even when API_URL is relative, so a stored file
// path can only ever resolve to our own server.
export const FILE_BASE = new URL(API_URL, window.location.origin).origin;

// fetch() with the session token attached. Every API call goes through here.
// A 401 while signed in means the session has ended, so the user is signed out
// (the router then shows the login page).
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    const { token } = useAuthStore.getState();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(input, { ...init, headers });
    if (response.status === 401 && useAuthStore.getState().isAuthenticated) {
        useAuthStore.getState().logout();
    }
    return response;
}

// Absolute URL for an uploaded file. Files need authentication, and <img> tags
// or new browser tabs cannot send headers, so the read-only file token is added
// to the URL. It is only ever attached to our own server's URLs.
export function fileUrl(pathOrUrl?: string | null): string {
    if (!pathOrUrl) return '';
    const url = /^https?:\/\//i.test(pathOrUrl)
        ? pathOrUrl
        : `${FILE_BASE}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
    const { fileToken } = useAuthStore.getState();
    if (!fileToken || !url.startsWith(`${FILE_BASE}/`)) return url;
    return `${url}${url.includes('?') ? '&' : '?'}ft=${encodeURIComponent(fileToken)}`;
}

// URL for the live notification stream (EventSource cannot send headers either).
export function notificationStreamUrl(): string {
    const { fileToken } = useAuthStore.getState();
    return `${API_URL}/notifications/stream${fileToken ? `?ft=${encodeURIComponent(fileToken)}` : ''}`;
}

async function fetchWithTimeout(resource: RequestInfo | URL, options: RequestInit & { timeout?: number } = {}) {
    const { timeout = 10000, ...init } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        return await authFetch(resource, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(id);
    }
}

// An API failure: `message` is the server's own text, so users see something
// useful; `status` and `code` let the caller react to specific cases.
export class ApiError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}

async function failure(response: Response): Promise<ApiError> {
    const text = await response.text();
    try {
        const body = JSON.parse(text);
        const message = body?.error || body?.message;
        if (message) return new ApiError(String(message), response.status, typeof body?.code === 'string' ? body.code : undefined);
    } catch { /* not JSON */ }
    return new ApiError(`API Error: ${response.statusText} (${response.status})`, response.status);
}

async function send<T>(method: string, endpoint: string, data?: unknown, timeout?: number): Promise<T> {
    const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
        method,
        headers: data !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: data !== undefined ? JSON.stringify(data) : undefined,
        timeout,
    });
    if (!response.ok) throw await failure(response);
    // Handle empty responses (204 No Content)
    if (response.status === 204) return {} as T;
    return response.json();
}

export const apiClient = {
    get: <T>(endpoint: string): Promise<T> => send<T>('GET', endpoint),
    post: <T>(endpoint: string, data: any, options?: { timeout?: number }): Promise<T> => send<T>('POST', endpoint, data, options?.timeout),
    put: <T>(endpoint: string, data: any): Promise<T> => send<T>('PUT', endpoint, data),
    patch: <T>(endpoint: string, data: any): Promise<T> => send<T>('PATCH', endpoint, data),
    delete: <T>(endpoint: string): Promise<T> => send<T>('DELETE', endpoint),
};
