export interface Medication {
    id: string;
    name: string;
    defaultDose: string;
    route: string;
    frequency?: string;
    infusionRate?: string;
    otherInstructions?: string;
    administrations: MedicationAdministration[];
}

export interface MedicationAdministration {
    id: string;
    patientId: string;
    medicationId: string;
    status: 'Scheduled' | 'Given' | 'Held' | 'NotGiven';
    dose?: string;
    timestamp: string;
    userId?: string;
    user?: { name: string }; // Nurse details
}

export const marApi = {
    getMAR: async (patientId: string): Promise<Medication[]> => {
        const response = await fetch(`http://localhost:3000/api/medications/${patientId}/mar`);
        if (!response.ok) throw new Error('Failed to fetch MAR');
        return response.json();
    },

    searchDrugs: async (query: string) => {
        const response = await fetch(`http://localhost:3000/api/medications/catalog?q=${encodeURIComponent(query)}`);
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
    }): Promise<Medication> => {
        const response = await fetch('http://localhost:3000/api/medications/prescribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to prescribe medication');
        return response.json();
    },

    administerMedication: async (data: { patientId: string; medicationId: string; status: string; dose?: string; userId?: string }): Promise<MedicationAdministration> => {
        const response = await fetch('http://localhost:3000/api/medications/administer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to administer medication');
        return response.json();
    }
};
