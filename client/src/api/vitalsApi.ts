import { apiClient } from './client';

export interface VitalSign {
    id: string;
    patientId: string;
    heartRate: number | null;
    bpSys: number | null;
    bpDia: number | null;
    spo2: number | null;
    temp: number | null;
    rr: number | null;
    rbs: number | null;
    imageUrl?: string | null;
    // Neurological, sedation and pain scores charted with the observation.
    gcsEye?: number | null;
    gcsVerbal?: number | null;
    gcsMotor?: number | null;
    gcsIntubated?: boolean;
    rass?: number | null;
    painScore?: number | null;
    painScale?: string | null;
    user?: { id: string; name: string; role: string } | null;
    timestamp: string;
}

export const vitalsApi = {
    getVitals: (patientId: string, startTime?: string, endTime?: string) => {
        const params = new URLSearchParams();
        if (startTime) params.append('startTime', startTime);
        if (endTime) params.append('endTime', endTime);
        const query = params.toString();
        return apiClient.get<VitalSign[]>(`/vitals/${patientId}${query ? `?${query}` : ''}`);
    },

    // Throws with the server's message when a value is outside the possible range.
    addVitals: (data: Record<string, unknown>) => apiClient.post<VitalSign>('/vitals', data),
};
