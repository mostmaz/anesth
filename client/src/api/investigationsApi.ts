
import { apiClient } from './client';

export type InvestigationType = 'LAB' | 'IMAGING';
export type InvestigationStatus = 'PRELIMINARY' | 'FINAL' | 'AMENDED';

export interface Investigation {
    id: string;
    patientId: string;
    orderId?: string;
    authorId: string;
    type: InvestigationType;
    category: string;
    title: string;
    status: InvestigationStatus;
    result?: any;
    impression?: string;
    conductedAt: string;
    author: {
        name: string;
        role: string;
    };
    order?: {
        title: string;
    };
}

export const investigationsApi = {
    getAll: async (patientId: string) => {
        return apiClient.get<Investigation[]>(`/investigations/${patientId}`);
    },

    create: async (data: {
        patientId: string;
        authorId: string;
        orderId?: string;
        type: InvestigationType;
        category: string;
        title: string;
        status?: InvestigationStatus;
        result: any;
        impression?: string;
        conductedAt?: string;
    }) => {
        return apiClient.post<Investigation>('/investigations', data);
    },

    delete: async (id: string) => {
        return apiClient.delete(`/investigations/${id}`);
    }
};
