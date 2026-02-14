
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
    }
};
