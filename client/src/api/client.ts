const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function fetchWithTimeout(resource: RequestInfo | URL, options: RequestInit & { timeout?: number } = {}) {
    const { timeout = 10000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);

    return response;
}

export const apiClient = {
    get: async <T>(endpoint: string): Promise<T> => {
        const response = await fetchWithTimeout(`${API_URL}${endpoint}`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API Error Body:", errorText);
            throw new Error(`API Error: ${response.statusText} (${response.status}) - ${errorText}`);
        }
        return response.json();
    },
    post: async <T>(endpoint: string, data: any, options?: { timeout?: number }): Promise<T> => {
        const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            timeout: options?.timeout,
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API Error Body:", errorText);
            throw new Error(`API Error: ${response.statusText} (${response.status}) - ${errorText}`);
        }
        return response.json();
    },
    patch: async <T>(endpoint: string, data: any): Promise<T> => {
        const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    },
    delete: async <T>(endpoint: string): Promise<T> => {
        const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        // Handle empty responses (204 No Content)
        if (response.status === 204) {
            return {} as T;
        }
        return response.json();
    }
};
