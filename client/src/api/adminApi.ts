
import { apiClient } from './client';

export interface User {
    id: string;
    name: string;
    username: string;
    role: 'SENIOR' | 'RESIDENT' | 'NURSE';
    lastLoginAt?: string | null;
}

export interface DrugCatalogItem {
    id: string;
    name: string;
    defaultDose?: string;
    defaultRoute?: string;
}

export const adminApi = {
    // User Management
    getUsers: async () => {
        return apiClient.get<User[]>('/users');
    },

    createUser: async (data: any) => {
        return apiClient.post<User>('/users', data);
    },

    deleteUser: async (id: string) => {
        return apiClient.delete(`/users/${id}`);
    },

    resetPassword: async (id: string, newPassword: string) => {
        return apiClient.put<{ success: boolean }>(`/users/${id}/password`, { newPassword });
    },

    // Drug Catalog
    getCatalog: async (query: string = '') => {
        return apiClient.get<DrugCatalogItem[]>(`/medications/catalog?q=${encodeURIComponent(query)}`);
    },

    addDrug: async (data: any) => {
        return apiClient.post<DrugCatalogItem>('/medications/catalog', data);
    },

    deleteDrug: async (id: string) => {
        return apiClient.delete<any>(`/medications/catalog/${id}`);
    },

    // Nurse Assignment (Using existing assignment routes)
    assignNurse: async (patientId: string, userId: string, assignerId?: string) => {
        return apiClient.post('/assignments', { patientId, userId, assignerId });
    },

    // For the assignment UI we might need to list all nurses and patients, 
    // we can reuse getUsers and existing patient APIs.
};
