
export interface VitalSign {
    id: string;
    patientId: string;
    heartRate: number | null;
    bpSys: number | null;
    bpDia: number | null;
    spo2: number | null;
    temp: number | null;
    rbs: number | null;
    timestamp: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const vitalsApi = {
    getVitals: async (patientId: string, startTime?: string, endTime?: string): Promise<VitalSign[]> => {
        let url = `${API_URL}/vitals/${patientId}`;
        const params = new URLSearchParams();
        if (startTime) params.append('startTime', startTime);
        if (endTime) params.append('endTime', endTime);

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch vitals');
        return response.json();
    },

    addVitals: async (data: any): Promise<VitalSign> => {
        const response = await fetch(`${API_URL}/vitals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to record vitals');
        return response.json();
    }
};
