
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

export const vitalsApi = {
    getVitals: async (patientId: string, startTime?: string, endTime?: string): Promise<VitalSign[]> => {
        let url = `http://localhost:3001/api/vitals/${patientId}`;
        const params = new URLSearchParams();
        if (startTime) params.append('startTime', startTime);
        if (endTime) params.append('endTime', endTime);
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch vitals');
        return response.json();
    },

    addVitals: async (data: { patientId: string; heartRate: number | null; bpSys: number | null; bpDia: number | null; spo2: number | null; temp: number | null; rbs: number | null }): Promise<VitalSign> => {
        const response = await fetch('http://localhost:3001/api/vitals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to record vitals');
        return response.json();
    }
};
