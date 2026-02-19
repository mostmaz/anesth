
import { apiClient } from './client';

export type OrderStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'DISCONTINUED';
export type OrderType = 'MEDICATION' | 'LAB' | 'IMAGING' | 'PROTOCOL' | 'NURSING' | 'DIET' | 'CONSULT' | 'PROCEDURE';
export type Priority = 'ROUTINE' | 'URGENT' | 'STAT';

export interface ClinicalOrder {
    id: string;
    patientId: string;
    authorId: string;
    approverId?: string;
    type: OrderType;
    status: OrderStatus;
    priority: Priority;
    title: string;
    details?: any;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    author: {
        name: string;
        role: string;
    };
    approver?: {
        name: string;
    };
}

export const ordersApi = {
    getOrders: async (patientId: string) => {
        return apiClient.get<ClinicalOrder[]>(`/orders/${patientId}`);
    },

    getPendingOrders: async () => {
        return apiClient.get<ClinicalOrder[]>('/orders/pending');
    },

    getActiveOrders: async () => {
        return apiClient.get<ClinicalOrder[]>('/orders/active');
    },

    getCompletedOrders: async () => {
        return apiClient.get<ClinicalOrder[]>('/orders/completed');
    },

    getRecentOrders: async () => {
        return apiClient.get<ClinicalOrder[]>('/orders/recent');
    },

    createOrder: async (data: {
        patientId: string;
        authorId: string;
        type: OrderType;
        title: string;
        priority: Priority;
        details?: any;
        notes?: string;
    }) => {
        return apiClient.post<ClinicalOrder>('/orders', data);
    },

    updateStatus: async (id: string, status: OrderStatus, userId: string) => {
        return apiClient.patch<ClinicalOrder>(`/orders/${id}/status`, { status, userId });
    }
};
