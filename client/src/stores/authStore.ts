
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type User } from '../types';

interface AuthState {
    user: User | null;
    // Session token: sent as a header on every API call.
    token: string | null;
    // Read-only token used in file URLs (<img>, PDFs in a new tab, event stream).
    fileToken: string | null;
    isAuthenticated: boolean;
    // True while the account still uses the shared default password.
    mustChangePassword: boolean;
    login: (token: string, user: User, fileToken?: string | null, mustChangePassword?: boolean) => void;
    // Called after a successful password change, with the replacement tokens.
    passwordChanged: (token?: string | null, fileToken?: string | null) => void;
    logout: () => void;
}

// Initial state
const INITIAL_STATE = {
    user: null,
    token: null,
    fileToken: null,
    isAuthenticated: false,
    mustChangePassword: false,
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            ...INITIAL_STATE,
            login: (token, user, fileToken = null, mustChangePassword = false) =>
                set({ token, user, fileToken, mustChangePassword, isAuthenticated: true }),
            passwordChanged: (token, fileToken) =>
                set((s) => ({
                    mustChangePassword: false,
                    token: token || s.token,
                    fileToken: fileToken || s.fileToken,
                })),
            logout: () => set({ ...INITIAL_STATE }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
