export interface Medication {
    id: string;
    name: string;
    defaultDose: string;
    route: string;
    frequency?: string;
    infusionRate?: string;
    otherInstructions?: string;
    isActive: boolean;
    startedAt: string;
    dilution?: number;
    durationReminder?: number;
    administrations: MedicationAdministration[];
}

export interface MedicationAdministration {
    id: string;
    patientId: string;
    medicationId: string;
    status: 'Scheduled' | 'Given' | 'Held' | 'NotGiven';
    dose?: string;
    dilution?: number;
    timestamp: string;
    userId?: string;
    user?: { name: string }; // Nurse details
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const marApi = {
    getMAR: async (patientId: string): Promise<Medication[]> => {
        const response = await fetch(`${API_URL}/medications/${patientId}/mar`);
        if (!response.ok) throw new Error('Failed to fetch MAR');
        return response.json();
    },

    searchDrugs: async (query: string) => {
        const response = await fetch(`${API_URL}/medications/catalog?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to search drugs');
        return response.json();
    },

    prescribeMedication: async (data: {
        patientId: string;
        name: string;
        dose: string;
        route: string;
        frequency?: string;
        infusionRate?: string;
        otherInstructions?: string;
        dilution?: number;
        durationReminder?: number;
        startedAt?: string;
    }): Promise<Medication> => {
        const response = await fetch(`${API_URL}/medications/prescribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to prescribe medication');
        return response.json();
    },

    administerMedication: async (data: { patientId: string; medicationId: string; status: string; dose?: string; dilution?: number; userId?: string }): Promise<MedicationAdministration> => {
        const response = await fetch(`${API_URL}/medications/administer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to administer medication');
        return response.json();
    },

    editMedication: async (id: string, data: { dose: string; route: string; frequency?: string; infusionRate?: string; otherInstructions?: string; dilution?: number; durationReminder?: number; }): Promise<Medication> => {
        const response = await fetch(`${API_URL}/medications/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to edit medication');
        return response.json();
    },

    discontinueMedication: async (id: string): Promise<Medication> => {
        const response = await fetch(`${API_URL}/medications/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: false }),
        });
        if (!response.ok) throw new Error('Failed to discontinue medication');
        return response.json();
    },

    deleteAdministration: async (id: string, userId: string): Promise<void> => {
        const response = await fetch(`${API_URL}/medications/administration/${id}`, {
            method: 'DELETE',
            headers: { 'X-User-Id': userId }
        });
        if (!response.ok) throw new Error('Failed to delete administration');
    }
};
