import { apiClient } from './client';

export interface VentilatorSetting {
    id: string;
    patientId: string;
    userId: string;
    mode: string;
    rate: number;
    fio2: number;
    ie: string;
    ps: number;
    vt: number;
    peep?: number | null;
    plateau?: number | null;
    pao2?: number | null;
    timestamp: string;
}

export const ventilatorApi = {
    getHistory: (patientId: string) => apiClient.get<VentilatorSetting[]>(`/ventilator/${patientId}`),

    recordSettings: (data: {
        patientId: string;
        mode: string;
        rate: number;
        fio2: number;
        ie: string;
        ps: number;
        vt: number;
        peep?: number | null;
        plateau?: number | null;
        pao2?: number | null;
        timestamp?: string;
    }) => apiClient.post<VentilatorSetting>('/ventilator', data),
};
