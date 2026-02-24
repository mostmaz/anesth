import { apiClient } from './client';

export interface Doctor {
    id: string;
    name: string;
    specialtyId?: string | null;
    specialty?: Specialty | null;
}

export interface Specialty {
    id: string;
    name: string;
}

export const doctorApi = {
    getDoctors: async (): Promise<Doctor[]> => {
        return await apiClient.get<Doctor[]>('/doctors');
    },

    createDoctor: async (data: { name: string; specialtyId?: string }): Promise<Doctor> => {
        return await apiClient.post<Doctor>('/doctors', data);
    },

    getSpecialties: async (): Promise<Specialty[]> => {
        return await apiClient.get<Specialty[]>('/doctors/specialties/all');
    },

    createSpecialty: async (data: { name: string }): Promise<Specialty> => {
        return await apiClient.post<Specialty>('/doctors/specialties', data);
    }
};
