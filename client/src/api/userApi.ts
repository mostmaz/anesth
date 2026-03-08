import { apiClient } from './client';

export const userApi = {
    getPreferences: async (userId: string) => {
        return apiClient.get<{ dismissedLabs: string[] }>(`/users/${userId}/preferences`);
    },
    dismissLab: async (userId: string, labId: string) => {
        return apiClient.post<{ success: true }>(`/users/${userId}/dismiss-lab`, { labId });
    }
};
