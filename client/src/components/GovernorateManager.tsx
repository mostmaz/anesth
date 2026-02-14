import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus, MapPin } from 'lucide-react';

const API_URL = 'http://localhost:3000/api/governorates';

export function GovernorateManager() {
    const [newGovernorate, setNewGovernorate] = useState('');
    const queryClient = useQueryClient();

    const { data: governorates, isLoading, isError } = useQuery({
        queryKey: ['governorates'],
        queryFn: async () => {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error('Failed to fetch governorates');
            return res.json();
        }
    });

    const addMutation = useMutation({
        mutationFn: async (name: string) => {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (!res.ok) throw new Error('Failed to add governorate');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['governorates'] });
            setNewGovernorate('');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete governorate');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['governorates'] });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newGovernorate.trim()) {
            addMutation.mutate(newGovernorate.trim());
        }
    };

    if (isLoading) return <div className="p-4 text-center">Loading governorates...</div>;
    if (isError) return <div className="p-4 text-red-500">Error loading governorates</div>;

    return (
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                <MapPin className="w-6 h-6 text-blue-600" />
                Governorates
            </h2>

            <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={newGovernorate}
                    onChange={(e) => setNewGovernorate(e.target.value)}
                    placeholder="New Governorate Name"
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    disabled={addMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {addMutation.isPending ? 'Adding...' : <><Plus size={20} /> Add</>}
                </button>
            </form>

            <div className="space-y-3">
                {governorates?.map((gov: any) => (
                    <div key={gov.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border hover:border-blue-200 transition-colors">
                        <span className="font-medium text-slate-700">{gov.name}</span>
                        <button
                            onClick={() => deleteMutation.mutate(gov.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
                {governorates?.length === 0 && (
                    <p className="text-center text-slate-500 py-4">No governorates found.</p>
                )}
            </div>
        </div>
    );
}
