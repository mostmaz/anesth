
const API_URL = 'http://localhost:3000/api';

export const uploadApi = {
    uploadImages: async (files: File[]) => {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload Error: ${response.statusText}`);
        }

        return response.json() as Promise<Array<{ url: string; filename: string; originalName: string }>>;
    },

    analyzeImage: async (filePath: string) => {
        // We use the apiClient here if possible, but the file is setup with fetch. 
        // Let's stick to the pattern or use the defined API_URL.
        // Actually, better to use the apiClient from '../api/client' if available, but for now I will match the style.
        // Wait, I should check if apiClient is available to use standard auth headers etc if needed. 
        // But for now, let's just use fetch to be consistent with this file.

        const response = await fetch(`${API_URL}/ocr/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filePath }),
        });

        if (!response.ok) {
            throw new Error(`Analysis Error: ${response.statusText}`);
        }

        return response.json();
    }
};
