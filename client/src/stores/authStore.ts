
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
}

// Initial state
const INITIAL_STATE = {
    user: null,
    token: null,
    isAuthenticated: false,
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            ...INITIAL_STATE,
            login: (token, user) => set({ token, user, isAuthenticated: true }),
            logout: () => set({ ...INITIAL_STATE }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
