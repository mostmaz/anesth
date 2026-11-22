import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../api/errorReport';

interface Props {
    children: ReactNode;
    // Changing this value clears the error (e.g. the current route).
    resetKey?: string;
}

interface State {
    error: Error | null;
}

// Keeps a crash in one screen from blanking the whole app: shows a recovery
// message instead and reports the error to our server.
export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // After an update, a screen's code file from the old version no longer
        // exists on the server. Reloading fetches the new version; this is done
        // once only, so a real fault cannot cause a reload loop.
        const staleCode = /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|Loading chunk/i.test(error?.message || '');
        if (staleCode) {
            try {
                if (!sessionStorage.getItem('reloaded-for-update')) {
                    sessionStorage.setItem('reloaded-for-update', String(Date.now()));
                    window.location.reload();
                    return;
                }
            } catch { /* storage unavailable: fall through to the message */ }
        }
        reportError(error, { component: (info.componentStack || '').split('\n').find((l) => l.trim())?.trim().slice(0, 100), fatal: true });
    }

    componentDidUpdate(prev: Props) {
        if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div role="alert" style={{ maxWidth: 480, margin: '60px auto', padding: 24, textAlign: 'center' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>This screen hit a problem</h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
                    Nothing you saved was lost. The error has been reported. Reload to continue; if it happens again, tell the unit lead which screen it was.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button type="button" className="icu-btn icu-btn-primary" onClick={() => window.location.reload()}>Reload</button>
                    <button type="button" className="icu-btn icu-btn-outline" onClick={() => { window.location.hash = '#/dashboard'; this.setState({ error: null }); }}>Back to dashboard</button>
                </div>
            </div>
        );
    }
}
