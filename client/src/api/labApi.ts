
const API_URL = 'http://localhost:3001/api';

export const fetchLabPatients = async (refresh: boolean = false) => {
    const response = await fetch(`${API_URL}/lab/patients${refresh ? '?refresh=true' : ''}`);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch patients');
    }
    return response.json();
};

export const importLabReport = async (patient: any) => {
    const response = await fetch(`${API_URL}/lab/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import report');
    }
    return response.json();
};

export const syncAllLabs = async () => {
    const response = await fetch(`${API_URL}/lab/sync-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to trigger sync');
    }
    return response.json();
};
