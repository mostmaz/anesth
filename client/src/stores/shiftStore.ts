import { create } from 'zustand';
import { type Shift } from '../types';
import { shiftApi } from '../api/shiftApi';

interface ShiftState {
    activeShift: Shift | null;
    checkActiveShift: (userId: string) => Promise<void>;
    startShift: (userId: string, type: 'DAY' | 'NIGHT') => Promise<void>;
    endShift: () => Promise<void>;
}

export const useShiftStore = create<ShiftState>((set, get) => ({
    activeShift: null,

    checkActiveShift: async (userId: string) => {
        try {
            const activeShift = await shiftApi.getActiveShift(userId);
            set({ activeShift });
        } catch (error) {
            console.error('Failed to check active shift:', error);
        }
    },

    startShift: async (userId, type) => {
        try {
            const shift = await shiftApi.startShift(userId, type);
            set({ activeShift: shift });
        } catch (error) {
            console.error('Failed to start shift:', error);
            throw error;
        }
    },

    endShift: async () => {
        const { activeShift } = get();
        if (!activeShift) return;
        try {
            await shiftApi.endShift(activeShift.id);
            set({ activeShift: null });
        } catch (error) {
            console.error('Failed to end shift:', error);
            throw error;
        }
    },
}));
