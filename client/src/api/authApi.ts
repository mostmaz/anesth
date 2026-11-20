
import { apiClient } from './client';
import { User } from '../types';

interface LoginResponse {
    token: string;
    fileToken?: string;
    mustChangePassword?: boolean;
    user: User;
}

export const authApi = {
    login: async (username: string, password: string) => {
        return apiClient.post<LoginResponse>('/auth/login', { username, password });
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
        // The server ends every session issued under the old password and returns
        // fresh tokens for this one.
        return apiClient.post<{ success: boolean; token?: string; fileToken?: string }>('/auth/change-password', { currentPassword, newPassword });
    },
};
