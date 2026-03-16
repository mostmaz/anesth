
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
    pdfFilename?: string;
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
    },

    deleteAll: async (patientId: string) => {
        return apiClient.delete(`/investigations/patient/${patientId}/all`);
    },

    sync: async (data: { patientId: string; mrn: string; name: string; authorId: string }, options?: { timeout?: number }) => {
        return apiClient.post<{ success: boolean; data: any[] }>('/lab/sync', data, options);
    },

    update: async (id: string, data: Partial<Investigation>) => {
        return apiClient.patch<Investigation>(`/investigations/${id}`, data);
    }
};
