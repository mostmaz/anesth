import { apiClient } from './client';

export interface AuditEntry {
    id: string;
    timestamp: string;
    action: string;
    status: number | null;
    path: string | null;
    details: string | null;
    ip: string | null;
    user: { id: string; name: string; username: string; role: string };
    patient: { id: string; name: string; mrn: string } | null;
}

export interface ClientErrorReport {
    id: string;
    userId: string | null;
    platform: string;
    appVersion: string | null;
    message: string;
    stack: string | null;
    context: Record<string, string> | null;
    createdAt: string;
}

export const auditApi = {
    list: (filters: { patientId?: string; userId?: string; q?: string; from?: string; to?: string; before?: string; limit?: number } = {}) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== '') params.append(key, String(value));
        }
        const query = params.toString();
        return apiClient.get<AuditEntry[]>(`/audit${query ? `?${query}` : ''}`);
    },

    clientErrors: () => apiClient.get<ClientErrorReport[]>('/audit/client-errors'),
};
