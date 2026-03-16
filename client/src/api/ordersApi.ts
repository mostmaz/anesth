
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
    reminderAt?: string;
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

    getPendingOrders: async (userId?: string) => {
        const url = userId ? `/orders/pending?userId=${userId}` : '/orders/pending';
        return apiClient.get<ClinicalOrder[]>(url);
    },

    getActiveOrders: async (userId?: string) => {
        const url = userId ? `/orders/active?userId=${userId}` : '/orders/active';
        return apiClient.get<ClinicalOrder[]>(url);
    },

    getCompletedOrders: async (userId?: string) => {
        const url = userId ? `/orders/completed?userId=${userId}` : '/orders/completed';
        return apiClient.get<ClinicalOrder[]>(url);
    },

    getRecentOrders: async (userId?: string) => {
        const url = userId ? `/orders/recent?userId=${userId}` : '/orders/recent';
        return apiClient.get<ClinicalOrder[]>(url);
    },

    createOrder: async (data: {
        patientId: string;
        authorId: string;
        type: OrderType;
        title: string;
        priority: Priority;
        details?: any;
        notes?: string;
        reminderAt?: string;
    }) => {
        return apiClient.post<ClinicalOrder>('/orders', data);
    },

    updateStatus: async (id: string, status: OrderStatus, userId: string) => {
        return apiClient.patch<ClinicalOrder>(`/orders/${id}/status`, { status, userId });
    },

    getDueReminders: async (userId?: string) => {
        const url = userId ? `/orders/due-reminders?userId=${userId}` : '/orders/due-reminders';
        return apiClient.get<ClinicalOrder[]>(url);
    },
};
