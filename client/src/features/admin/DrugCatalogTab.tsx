
import { useState, useEffect } from 'react';
import { adminApi, DrugCatalogItem } from '../../api/adminApi';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Pill, Trash2, Plus } from 'lucide-react';

export default function DrugCatalogTab() {
    const [drugs, setDrugs] = useState<DrugCatalogItem[]>([]);
    const [search, setSearch] = useState('');

    // New Drug Form
    const [newName, setNewName] = useState('');
    const [newDose, setNewDose] = useState('');
    const [newRoute, setNewRoute] = useState('');

    const fetchDrugs = async () => {
        try {
            const data = await adminApi.getCatalog(search);
            setDrugs(data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        const timer = setTimeout(fetchDrugs, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const handleAddDrug = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adminApi.addDrug({ name: newName, defaultDose: newDose, defaultRoute: newRoute });
            toast.success("Drug added to catalog");
            setNewName('');
            setNewDose('');
            setNewRoute('');
            fetchDrugs();
        } catch (error) {
            toast.error("Failed to add drug");
        }
    };

    const handleDeleteDrug = async (id: string) => {
        if (!confirm("Remove this drug from catalog?")) return;
        try {
            await adminApi.deleteDrug(id);
            toast.success("Drug removed");
            fetchDrugs();
        } catch (error) {
            toast.error("Failed to remove drug");
        }
    };

    return (
        <div className="space-y-8">
            {/* Add Drug Form */}
            <div className="bg-slate-50 p-5 rounded-lg border">
                <h3 className="font-medium mb-4 flex items-center gap-2"><Pill className="w-5 h-5" /> Add New Drug</h3>
                <form onSubmit={handleAddDrug} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium mb-1">Drug Name</label>
                        <input className="w-full p-2 border rounded" required value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Paracetamol" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Default Dose</label>
                        <input className="w-full p-2 border rounded" value={newDose} onChange={e => setNewDose(e.target.value)} placeholder="e.g. 1g" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Default Route</label>
                        <input className="w-full p-2 border rounded" value={newRoute} onChange={e => setNewRoute(e.target.value)} placeholder="e.g. IV" />
                    </div>
                    <Button type="submit"><Plus className="w-4 h-4 mr-2" /> Add Drug</Button>
                </form>
            </div>

            {/* List */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Catalog Entries</h3>
                    <input
                        className="p-2 border rounded w-64"
                        placeholder="Search catalog..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 font-medium sticky top-0">
                            <tr>
                                <th className="p-3">Drug Name</th>
                                <th className="p-3">Default Dose</th>
                                <th className="p-3">Route</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {drugs.map(drug => (
                                <tr key={drug.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">{drug.name}</td>
                                    <td className="p-3 text-muted-foreground">{drug.defaultDose || '-'}</td>
                                    <td className="p-3 text-muted-foreground">{drug.defaultRoute || '-'}</td>
                                    <td className="p-3 text-right">
                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteDrug(drug.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {drugs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">No drugs found in catalog.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
