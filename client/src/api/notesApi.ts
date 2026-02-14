
import { apiClient } from './client';

export type NoteType = 'ADMISSION' | 'PROGRESS' | 'PROCEDURE' | 'DISCHARGE' | 'NURSING' | 'CONSULT' | 'OTHER';

export interface ClinicalNote {
    id: string;
    patientId: string;
    authorId: string;
    type: NoteType;
    title: string;
    content: string;
    data?: any;
    createdAt: string;
    author: {
        name: string;
        role: string;
    };
}

export const notesApi = {
    getAll: async (patientId: string, type?: NoteType) => {
        let url = `/notes/${patientId}`;
        if (type) url += `?type=${type}`;
        return apiClient.get<ClinicalNote[]>(url);
    },

    create: async (data: {
        patientId: string;
        authorId: string;
        type: NoteType;
        title: string;
        content: string;
        data?: any;
    }) => {
        return apiClient.post<ClinicalNote>('/notes', data);
    }
};
