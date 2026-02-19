import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

interface Patient {
    id: string;
    name: string;
    mrn: string;
    gender: string;
    dob: string;
}

export default function PatientList() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const data = await apiClient.get<Patient[]>('/patients');
                setPatients(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPatients();
    }, []);

    if (loading) return <div className="p-4">Loading patients...</div>;
    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-4 text-slate-800">Patient List</h2>

            {patients.length === 0 ? (
                <div className="bg-white p-6 rounded-lg shadow text-center text-slate-500">
                    No patients found.
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MRN</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {patients.map((patient) => (
                                <tr key={patient.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.mrn}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.gender}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(patient.dob).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
