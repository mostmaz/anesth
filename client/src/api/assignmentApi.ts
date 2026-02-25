
import { apiClient } from './client';

export interface Assignment {
    id: string;
    patientId: string;
    userId: string;
    isActive: boolean;
    isPending: boolean;
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

    getPending: async () => {
        return apiClient.get<Assignment[]>('/assignments/pending');
    },

    assign: async (patientId: string, userId: string) => {
        return apiClient.post<{ success: boolean; pending: boolean; data: Assignment; message?: string }>(
            '/assignments', { patientId, userId }
        );
    },

    unassign: async (patientId: string, userId: string) => {
        return apiClient.post('/assignments/end', { patientId, userId });
    },

    approve: async (id: string) => {
        return apiClient.patch(`/assignments/${id}/approve`, {});
    },

    reject: async (id: string) => {
        return apiClient.patch(`/assignments/${id}/reject`, {});
    }
};
