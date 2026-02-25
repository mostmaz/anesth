import { Shift } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const shiftApi = {
    startShift: async (userId: string, type: 'DAY' | 'NIGHT'): Promise<Shift> => {
        const response = await fetch(`${API_URL}/shifts/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, type }),
        });
        if (!response.ok) throw new Error('Failed to start shift');
        return response.json();
    },

    endShift: async (shiftId: string): Promise<Shift> => {
        const response = await fetch(`${API_URL}/shifts/${shiftId}/end`, {
            method: 'PATCH',
        });
        if (!response.ok) throw new Error('Failed to end shift');
        return response.json();
    },

    getActiveShift: async (userId: string): Promise<Shift | null> => {
        const response = await fetch(`${API_URL}/shifts/active/${userId}`);
        if (!response.ok) return null; // 404 or other error means no active shift usually
        return response.json();
    },

    getStaffOnDuty: async () => {
        const response = await fetch(`${API_URL}/shifts/staff-on-duty`);
        if (!response.ok) throw new Error('Failed to fetch staff on duty');
        return response.json();
    }
};
