
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
    timestamp: string;
}

export const ventilatorApi = {
    getHistory: async (patientId: string): Promise<VentilatorSetting[]> => {
        const response = await fetch(`${API_URL}/ventilator/${patientId}`);
        if (!response.ok) throw new Error('Failed to fetch ventilator history');
        return response.json();
    },

    recordSettings: async (data: Omit<VentilatorSetting, 'id'>): Promise<VentilatorSetting> => {
        const response = await fetch(`${API_URL}/ventilator`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to record ventilator settings');
        return response.json();
    }
};
