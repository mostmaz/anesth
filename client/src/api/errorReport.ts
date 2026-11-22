import { API_URL } from './client';
import { useAuthStore } from '../stores/authStore';

// Sends app errors to our own server so they can be fixed. Only the error text
// and stack are sent — never patient data. Failures here are ignored: error
// reporting must not cause more errors.

const sentRecently = new Map<string, number>();
const MAX_PER_SESSION = 20;
let sentCount = 0;

export function reportError(error: unknown, context: { component?: string; fatal?: boolean } = {}) {
    try {
        const { token, isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated || !token || sentCount >= MAX_PER_SESSION) return;

        const e = error as { message?: string; stack?: string } | undefined;
        const message = String(e?.message || error || 'Unknown error').slice(0, 500);
        // The same error is reported at most once a minute.
        const last = sentRecently.get(message);
        if (last && Date.now() - last < 60_000) return;
        sentRecently.set(message, Date.now());
        sentCount += 1;

        void fetch(`${API_URL}/client-errors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                platform: 'web',
                appVersion: import.meta.env.VITE_APP_VERSION || undefined,
                message,
                stack: typeof e?.stack === 'string' ? e.stack.slice(0, 6000) : undefined,
                context: {
                    route: window.location.hash.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, ':id').slice(0, 120),
                    component: context.component,
                    fatal: context.fatal ? 'true' : undefined,
                },
            }),
            keepalive: true,
        }).catch(() => { /* ignore */ });
    } catch { /* ignore */ }
}

// Catches errors that no component handled.
export function installGlobalErrorReporting() {
    window.addEventListener('error', (event) => reportError(event.error || event.message));
    window.addEventListener('unhandledrejection', (event) => reportError(event.reason));
}
