
import { apiClient } from './client';

export interface Assignment {
    id: string;
    patientId: string;
    userId: string;
    isActive: boolean;
    user: {
        id: string;
        name: string;
        role: string;
    };
    patient: {
        id: string;
        name: string;
        mrn: string;
    };
}

export const assignmentApi = {
    getActive: async () => {
        return apiClient.get<Assignment[]>('/assignments/active');
    },

    assign: async (patientId: string, userId: string) => {
        return apiClient.post<{ success: true; data: Assignment }>('/assignments', { patientId, userId });
    },

    unassign: async (patientId: string, userId: string) => {
        return apiClient.post('/assignments/end', { patientId, userId });
    }
};
