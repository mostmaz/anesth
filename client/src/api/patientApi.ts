import { apiClient } from './client';

export interface TimelineEvent {
    id: string;
    type: 'MEDICATION' | 'ORDER' | 'CONSULTATION' | 'NOTE' | 'INVESTIGATION';
    title: string;
    status: string;
    timestamp: string;
    details?: string;
}

export const patientApi = {
    getTimeline: async (patientId: string): Promise<TimelineEvent[]> => {
        return apiClient.get<TimelineEvent[]>(`/patients/${patientId}/timeline`);
    },

    getPatient: async (patientId: string) => {
        return apiClient.get(`/patients/${patientId}`);
    },

    getConsultations: async (patientId: string) => {
        return apiClient.get(`/patients/${patientId}/consultations`);
    },

    addConsultation: async (patientId: string, data: any) => {
        return apiClient.post(`/patients/${patientId}/consultations`, data);
    }
};
