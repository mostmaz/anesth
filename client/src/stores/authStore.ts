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

// Mock initial user for dev speed until login is implemented
const MOCK_USER: User = {
    id: 'mock-nurse-id',
    username: 'nursajane',
    name: 'Jane Doe',
    role: 'NURSE'
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: MOCK_USER, // Default will still be mock if nothing in storage
            token: 'mock-token',
            isAuthenticated: true,
            login: (token, user) => set({ token, user, isAuthenticated: true }),
            logout: () => set({ token: null, user: null, isAuthenticated: false }),
        }),
        {
            name: 'auth-storage', // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
        }
    )
);
