
import { useState, useEffect } from 'react';
import { adminApi, User } from '../../api/adminApi';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

interface Patient {
    id: string;
    name: string;
    mrn: string;
    assignments: { user: { name: string, role: string } }[];
}

export default function NurseAssignmentTab() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [nurses, setNurses] = useState<User[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<string>('');
    const [selectedNurse, setSelectedNurse] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch patients with their active assignments
            const patientsData = await apiClient.get<Patient[]>('/patients');
            setPatients(patientsData);

            // Fetch users and filter for Nurses (and maybe Residents/Seniors if needed)
            const usersData = await adminApi.getUsers();
            setNurses(usersData.filter(u => u.role === 'NURSE' || u.role === 'RESIDENT'));
        } catch (error) {
            console.error(error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const { user } = useAuthStore();

    const handleAssign = async () => {
        if (!selectedPatient || !selectedNurse) return;

        try {
            await adminApi.assignNurse(selectedPatient, selectedNurse, user?.id);
            toast.success("Nurse assigned successfully");
            fetchData(); // Refresh to show new assignment
            setSelectedPatient('');
            setSelectedNurse('');
        } catch (error: any) {
            toast.error(error.message || "Failed to assign nurse");
        }
    };

    if (loading && patients.length === 0) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex gap-4 items-end bg-slate-50 p-4 rounded-lg border">
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Select Patient</label>
                    <select
                        className="w-full p-2 border rounded"
                        value={selectedPatient}
                        onChange={e => setSelectedPatient(e.target.value)}
                    >
                        <option value="">-- Choose Patient --</option>
                        {patients.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (MRN: {p.mrn})</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Select Nurse/Resident</label>
                    <select
                        className="w-full p-2 border rounded"
                        value={selectedNurse}
                        onChange={e => setSelectedNurse(e.target.value)}
                    >
                        <option value="">-- Choose Staff --</option>
                        {nurses.map(n => (
                            <option key={n.id} value={n.id}>{n.name} ({n.role})</option>
                        ))}
                    </select>
                </div>
                <Button onClick={handleAssign} disabled={!selectedPatient || !selectedNurse}>
                    <UserPlus className="w-4 h-4 mr-2" /> Assign
                </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 font-medium">
                        <tr>
                            <th className="p-3">Patient</th>
                            <th className="p-3">Assigned Staff</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {patients.map(patient => (
                            <tr key={patient.id} className="hover:bg-slate-50">
                                <td className="p-3 font-medium">{patient.name} <span className="text-xs text-muted-foreground">({patient.mrn})</span></td>
                                <td className="p-3">
                                    {patient.assignments?.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {patient.assignments.map((a: any, i) => (
                                                <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
                                                    {a.user ? `${a.user.name} (${a.user.role})` : 'Unknown'}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 italic">No active assignments</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
