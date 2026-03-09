
import { apiClient } from './client';

export interface IOEntry {
    id: string;
    patientId: string;
    userId: string;
    type: 'INPUT' | 'OUTPUT';
    category: string;
    amount: number;
    notes?: string;
    timestamp: string;
    user: {
        name: string;
    };
    status: 'APPROVED' | 'PENDING_EDIT';
    pendingValue?: number | null;
}

export const ioApi = {
    getHistory: async (patientId: string) => {
        return apiClient.get<IOEntry[]>(`/io/${patientId}`);
    },

    addEntry: async (data: {
        patientId: string;
        userId: string;
        shiftId?: string;
        type: 'INPUT' | 'OUTPUT';
        category: string;
        amount: number;
        notes?: string;
    }) => {
        return apiClient.post<IOEntry>('/io', data);
    },

    editEntry: async (id: string, amount: number, userId: string): Promise<IOEntry> => {
        return apiClient.put<IOEntry>(`/io/${id}`, { amount, userId });
    },

    approveEdit: async (id: string): Promise<IOEntry> => {
        return apiClient.patch<IOEntry>(`/io/${id}/approve`, {});
    },

    rejectEdit: async (id: string): Promise<IOEntry> => {
        return apiClient.patch<IOEntry>(`/io/${id}/reject`, {});
    }
};
