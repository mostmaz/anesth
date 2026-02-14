
import { apiClient } from './client';

export interface CheckIn {
    id: string;
    patientId: string;
    userId: string;
    airwaySafe: boolean;
    breathingOk: boolean;
    circulationOk: boolean;
    notes?: string;
    timestamp: string;
    user: {
        name: string;
    };
}

export const checkinApi = {
    getHistory: async (patientId: string) => {
        return apiClient.get<CheckIn[]>(`/checkin/${patientId}`);
    },

    create: async (data: {
        patientId: string;
        userId: string;
        shiftId?: string;
        airwaySafe: boolean;
        breathingOk: boolean;
        circulationOk: boolean;
        notes?: string;
    }) => {
        return apiClient.post<CheckIn>('/checkin', data);
    }
};
