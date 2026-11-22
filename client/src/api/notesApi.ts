
import { apiClient } from './client';

export type NoteType = 'ADMISSION' | 'PROGRESS' | 'PROCEDURE' | 'DISCHARGE' | 'NURSING' | 'CONSULT' | 'EVENT' | 'ROUND' | 'OTHER';

// A ward round. New rounds are saved with the type ROUND; older ones were saved
// as PROGRESS notes marked with data.kind = 'ROUND'.
export const isRoundNote = (n: { type?: string; data?: any }) => n?.type === 'ROUND' || n?.data?.kind === 'ROUND';

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
        authorId?: string;
        type: NoteType;
        title: string;
        content: string;
        data?: any;
    }) => {
        return apiClient.post<ClinicalNote>('/notes', data);
    }
};
