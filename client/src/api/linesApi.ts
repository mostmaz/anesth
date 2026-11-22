import { apiClient } from './client';

export interface LineCheck {
    id: string;
    lineId: string;
    items: Record<string, boolean>;
    notes: string | null;
    timestamp: string;
    user: { id: string; name: string; role: string };
}

export interface PatientLine {
    id: string;
    patientId: string;
    type: string;
    site: string | null;
    size: string | null;
    insertedAt: string;
    removedAt: string | null;
    removalReason: string | null;
    notes: string | null;
    insertedBy: { id: string; name: string; role: string };
    removedBy: { id: string; name: string; role: string } | null;
    checks: LineCheck[];
}

export const linesApi = {
    list: (patientId: string) => apiClient.get<PatientLine[]>(`/lines/${patientId}`),

    add: (data: { patientId: string; type: string; site?: string; size?: string; notes?: string; insertedAt?: string }) =>
        apiClient.post<PatientLine>('/lines', data),

    update: (id: string, data: { site?: string; size?: string; notes?: string; insertedAt?: string }) =>
        apiClient.patch<PatientLine>(`/lines/${id}`, data),

    remove: (id: string, data: { reason?: string; removedAt?: string }) =>
        apiClient.post<PatientLine>(`/lines/${id}/remove`, data),

    saveCheck: (id: string, data: { items: Record<string, boolean>; notes?: string }) =>
        apiClient.post<PatientLine>(`/lines/${id}/checks`, data),

    deleteEntry: (id: string) => apiClient.delete<{ success: boolean }>(`/lines/${id}`),
};
