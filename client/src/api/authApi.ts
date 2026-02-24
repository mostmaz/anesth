
import { apiClient } from './client';
import { User } from '../types';

interface LoginResponse {
    token: string;
    user: User;
}

export const authApi = {
    login: async (username: string, password?: string) => {
        // If password is not provided (legacy mock UI), use "password" or empty
        const payload = { username, password: password || 'password' }; // 'password' matches the default/seed password usually
        // However, seeded users have hash.
        // We need to handle the case where user types just username in the old UI.
        // But the NEW UI in Login.tsx has a password field (defaulting to "password").

        const response = await apiClient.post<LoginResponse>('/auth/login', payload);
        return response;
    }
};
