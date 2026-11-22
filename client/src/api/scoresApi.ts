import { apiClient } from './client';

export type ScoreType = 'SOFA' | 'APACHE2';

export interface ClinicalScore {
    id: string;
    patientId: string;
    type: ScoreType;
    total: number;
    // Points per component, plus `missing`: the components that could not be scored.
    components: Record<string, number | null | string[]>;
    inputs: Record<string, unknown>;
    timestamp: string;
    author: { id: string; name: string; role: string };
}

export const scoresApi = {
    list: (patientId: string, type?: ScoreType) =>
        apiClient.get<ClinicalScore[]>(`/scores/${patientId}${type ? `?type=${type}` : ''}`),

    // The server recalculates the total from the values sent.
    save: (data: { patientId: string; type: ScoreType; inputs: object }) =>
        apiClient.post<ClinicalScore>('/scores', data),

    deleteEntry: (id: string) => apiClient.delete<{ success: boolean }>(`/scores/${id}`),
};
