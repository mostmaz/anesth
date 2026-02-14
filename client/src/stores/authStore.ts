import { create } from 'zustand';
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

export const useAuthStore = create<AuthState>((set) => ({
    user: MOCK_USER, // Default to logged in for now
    token: 'mock-token',
    isAuthenticated: true,
    login: (token, user) => set({ token, user, isAuthenticated: true }),
    logout: () => set({ token: null, user: null, isAuthenticated: false }),
}));
